/**
 * API Test Utilities
 *
 * Provides an authenticated APIRequestContext for SimplyConf REST API tests.
 * Uses a headless browser login to obtain WP session cookies + nonce, then
 * creates a pure-API request context (no browser needed per test).
 */

const { request: playwrightRequest } = require('@playwright/test');
const { loginAsAdmin } = require('../../utils/auth');
const { navigateToAdmin } = require('../../utils/navigation');

const BASE_URL = process.env.WP_BASE_URL || 'http://simplyconf.local';
const EVENT_ID = Number(process.env.TEST_EVENT_ID || 1);

/**
 * Create an authenticated admin API request context.
 *
 * @param {import('@playwright/test').Browser} browser
 * @returns {Promise<{api: import('@playwright/test').APIRequestContext, eventId: number}>}
 */
async function createAdminApi(browser) {
	const page = await browser.newPage();
	try {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/events');

		const nonce = await page.evaluate(() => window.simplyconf?.nonce || '');

		const storageState = await page.context().storageState();

		const api = await playwrightRequest.newContext({
			baseURL: BASE_URL,
			storageState,
			extraHTTPHeaders: {
				'X-WP-Nonce': nonce,
				'Content-Type': 'application/json',
			},
		});

		return { api, eventId: EVENT_ID };
	} finally {
		await page.close();
	}
}

/**
 * Create an unauthenticated API request context (no cookies, no nonce).
 */
async function createUnauthApi() {
	return playwrightRequest.newContext({ baseURL: BASE_URL });
}

module.exports = { createAdminApi, createUnauthApi, BASE_URL, EVENT_ID };
