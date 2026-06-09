const { test, expect } = require('@playwright/test');
const { loginAsUser } = require('../../utils/auth');

test.describe('Session Debug', () => {
	test('should maintain session across navigation', async ({ page }) => {
		const username = process.env.WP_TEST_REVIEWER_USERNAME || 'demo_reviewer';
		const password = process.env.WP_TEST_REVIEWER_PASSWORD;

		// Login
		await loginAsUser(page, username, password);

		// Navigate to frontend
		await page.goto('/dashboard/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		console.log('Current URL:', page.url());

		// Check if we see login form (bad) or dashboard menu (good)
		const loginForm = page.locator('input#user_login');
		const dashboardMenu = page.locator('.sc-menu');

		const hasLoginForm = await loginForm.isVisible().catch(() => false);
		const hasDashboardMenu = await dashboardMenu.isVisible().catch(() => false);

		console.log('Has login form:', hasLoginForm);
		console.log('Has dashboard menu:', hasDashboardMenu);

		// Take screenshot
		await page.screenshot({ path: 'session-debug.png', fullPage: true });

		// Check cookies
		const cookies = await page.context().cookies();
		console.log(
			'Auth cookies:',
			cookies.filter((c) => c.name.includes('wordpress'))
		);

		expect(hasDashboardMenu).toBe(true);
	});
});
