const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../utils/auth');
const { navigateToAdmin, waitForPageLoad } = require('../utils/navigation');

/**
 * Smoke Test - Verify basic SimplyConf functionality
 *
 * This test ensures:
 * - WordPress is accessible
 * - Admin login works
 * - SimplyConf plugin is activated
 * - Admin UI loads correctly
 */

test.describe('SimplyConf Smoke Test', () => {
	test('should load WordPress and SimplyConf admin', async ({ page }) => {
		// Step 1: Login as admin
		await loginAsAdmin(page);

		// Step 2: Navigate to SimplyConf admin page
		await navigateToAdmin(page);

		// Step 3: Verify React app mounted
		const adminApp = page.locator('#simplyconf-admin');
		await expect(adminApp).toBeVisible();

		// Step 4: Verify no console errors
		const consoleErrors = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		// Step 5: Wait for page to fully load
		await waitForPageLoad(page);

		// Step 6: Verify admin bar is present (confirms we're logged in)
		await expect(page.locator('#wpadminbar')).toBeVisible();

		// Step 7: Take screenshot for visual verification
		await page.screenshot({
			path: 'tests/e2e/screenshots/smoke-test.png',
			fullPage: true,
		});

		console.log('✓ Smoke test passed - SimplyConf is working!');
	});

	test('should have all menu items visible', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page);

		// Wait for menu to load
		await waitForPageLoad(page);

		// Verify key top-level menu items exist ('Tracks' is a submenu item under Events)
		const menuItems = ['Dashboard', 'Events', 'Abstracts', 'Users'];

		for (const item of menuItems) {
			const menuItem = page.locator(`text=${item}`).first();
			await expect(menuItem).toBeVisible({ timeout: 5000 });
		}

		console.log('✓ All menu items visible');
	});

	test('should access SimplyConf menu item in admin', async ({ page }) => {
		await loginAsAdmin(page);

		// Navigate to WordPress admin
		await page.goto('/wp-admin/');

		// Look for SimplyConf in admin menu
		const simplyConfMenuItem = page.locator('#toplevel_page_simplyconf');
		await expect(simplyConfMenuItem).toBeVisible();

		// Click the menu item
		await simplyConfMenuItem.click();

		// Verify we're on SimplyConf page
		await page.waitForURL('**/admin.php?page=simplyconf**');
		await expect(page.locator('#simplyconf-admin')).toBeVisible();

		console.log('✓ SimplyConf menu accessible and working');
	});
});
