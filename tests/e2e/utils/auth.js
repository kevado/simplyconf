const { expect } = require('@playwright/test');

/**
 * Authentication utilities for WordPress E2E tests
 */

/**
 * Login as WordPress admin
 * @param {import('@playwright/test').Page} page
 * @param {string} username - Default: from WP_USERNAME env var
 * @param {string} password - Default: from WP_PASSWORD env var
 */
async function loginAsAdmin(
	page,
	username = process.env.WP_USERNAME || 'admin',
	password = process.env.WP_PASSWORD || 'admin'
) {
	try {
		// Check if already logged in
		const adminBar = page.locator('#wpadminbar');
		if (await adminBar.isVisible().catch(() => false)) {
			console.log('✓ Already logged in');
			return;
		}

		// Clear cookies and storage first to ensure clean login
		await page.context().clearCookies();

		// Navigate to WordPress login page
		await page.goto('/wp-login.php', {
			waitUntil: 'networkidle',
			timeout: 15000,
		});

		// Wait for login form to be fully loaded
		await page.waitForSelector('#user_login', {
			state: 'visible',
			timeout: 10000,
		});

		// Clear and fill in credentials (use clear + type for reliability)
		await page.locator('#user_login').clear();
		await page.locator('#user_login').fill(username);

		await page.locator('#user_pass').clear();
		await page.locator('#user_pass').fill(password);

		// Click login button
		await page.click('#wp-submit');

		// Wait for dashboard to load (admin bar is visible indicator)
		await expect(page.locator('#wpadminbar')).toBeVisible({ timeout: 15000 });

		console.log(`✓ Logged in as admin (${username})`);
	} catch (error) {
		console.error('Login failed:', error.message);
		console.error('Current URL:', page.url());
		console.error(
			'Verify WordPress is running at:',
			process.env.WP_BASE_URL || 'http://simplyconf.local'
		);
		throw error;
	}
}

/**
 * Login as a regular WordPress user
 * @param {import('@playwright/test').Page} page
 * @param {string} username
 * @param {string} password
 */
async function loginAsUser(page, username, password) {
	await page.goto('/wp-login.php');
	await page.fill('#user_login', username);
	await page.fill('#user_pass', password);
	await page.click('#wp-submit');

	// For non-admin users, wait for frontend or redirect
	await page.waitForLoadState('networkidle');

	// Verify login was successful by checking for WordPress auth cookies
	const cookies = await page.context().cookies();
	const hasAuthCookie = cookies.some((c) =>
		c.name.includes('wordpress_logged_in')
	);

	if (!hasAuthCookie) {
		throw new Error('Login failed - no auth cookie found');
	}

	console.log(`✓ Logged in as user (${username})`);
}

/**
 * Logout from WordPress
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
	// Navigate to logout URL
	await page.goto('/wp-login.php?action=logout');

	// Confirm logout if needed
	const confirmButton = page.locator('a:has-text("log out")');
	if (await confirmButton.isVisible()) {
		await confirmButton.click();
	}

	// Wait for login page
	await expect(page.locator('#user_login')).toBeVisible();

	console.log('✓ Logged out');
}

/**
 * Check if user is logged in
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function isLoggedIn(page) {
	try {
		await page.goto('/wp-admin/', { waitUntil: 'domcontentloaded' });
		return await page.locator('#wpadminbar').isVisible({ timeout: 2000 });
	} catch {
		return false;
	}
}

module.exports = {
	loginAsAdmin,
	loginAsUser,
	logout,
	isLoggedIn,
};
