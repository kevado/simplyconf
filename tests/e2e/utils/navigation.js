const { expect } = require('@playwright/test');

/**
 * Navigation utilities for SimplyConf
 */

/**
 * Navigate to SimplyConf admin page
 * @param {import('@playwright/test').Page} page
 * @param {string} route - Hash route (e.g., '/events', '/abstracts')
 */
async function navigateToAdmin(page, route = '') {
	const url = `/wp-admin/admin.php?page=simplyconf${route ? `#${route}` : ''}`;
	await page.goto(url);

	// Wait for React app to mount - try multiple selectors for robustness
	try {
		await page.waitForSelector('#simplyconf-admin', {
			timeout: 15000,
			state: 'visible',
		});
	} catch (e) {
		// Fallback: wait for any common admin content or just network idle
		console.log('Primary selector not found, using fallback wait...');
		await page.waitForLoadState('networkidle', { timeout: 10000 });
	}

	console.log(`✓ Navigated to admin: ${route || 'dashboard'}`);
}

/**
 * Navigate to SimplyConf frontend dashboard
 * @param {import('@playwright/test').Page} page
 * @param {string} route - Hash route (e.g., '/submissions', '/reviews')
 */
async function navigateToFrontend(page, route = '') {
	// Navigate to page with [simplyconf] shortcode (default: /dashboard/)
	// Adjust this slug if your shortcode page has a different URL
	const frontendPage = process.env.WP_FRONTEND_PAGE || '/dashboard/';
	const url = `${frontendPage}${route ? `#${route}` : ''}`;
	await page.goto(url);

	// Wait for React app to mount
	await page.waitForSelector('#simplyconf-dashboard', { timeout: 10000 });

	// Wait for loading to complete
	await page.waitForLoadState('networkidle');

	console.log(`✓ Navigated to frontend: ${route || 'dashboard'}`);
}

/**
 * Wait for API request to complete
 * @param {import('@playwright/test').Page} page
 * @param {string} endpoint - API endpoint to wait for (e.g., '/events')
 */
async function waitForAPIRequest(page, endpoint) {
	await page.waitForResponse(
		(response) =>
			response.url().includes(endpoint) && response.status() === 200,
		{ timeout: 10000 }
	);
	console.log(`✓ API request completed: ${endpoint}`);
}

/**
 * Wait for page to finish loading (no spinners)
 * @param {import('@playwright/test').Page} page
 */
async function waitForPageLoad(page) {
	// Wait for common loading indicators to disappear
	const spinners = page.locator('.sc-spin-spinning');
	if ((await spinners.count()) > 0) {
		await spinners.first().waitFor({ state: 'hidden', timeout: 10000 });
	}

	await page.waitForLoadState('networkidle');
}

/**
 * Navigate using React Router hash navigation
 * @param {import('@playwright/test').Page} page
 * @param {string} route - Route path
 */
async function navigateToRoute(page, route) {
	await page.evaluate((r) => {
		window.location.hash = r;
	}, route);

	await page.waitForLoadState('networkidle');
	console.log(`✓ Navigated to route: ${route}`);
}

module.exports = {
	navigateToAdmin,
	navigateToFrontend,
	waitForAPIRequest,
	waitForPageLoad,
	navigateToRoute,
};
