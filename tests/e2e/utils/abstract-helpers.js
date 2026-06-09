const { request } = require('@playwright/test');

/**
 * Create an abstract via REST API
 * @param {object} abstractData
 * @param {object} page - Playwright page object (optional) to use existing session
 * @returns {Promise<object>} Created abstract object
 */
async function createTestAbstract(abstractData = {}, page = null) {
	let requestContext;
	const headers = {
		'Content-Type': 'application/json',
	};

	if (page) {
		// Use the page's request context which shares cookies/session
		requestContext = page.request;

		// We need the nonce. Usually available in window.wpApiSettings.nonce or similar.
		// In this app, it seems to be in window.simplyconf.nonce
		const nonce = await page.evaluate(() => {
			return window.simplyconf?.nonce || window.wpApiSettings?.nonce || '';
		});
		console.log('Using nonce:', nonce);
		if (nonce) {
			headers['X-WP-Nonce'] = nonce;
		}
	} else {
		// Fallback to Basic Auth with new context
		const context = await request.newContext({
			baseURL: process.env.WP_BASE_URL || 'http://simplyconf.local',
		});
		requestContext = context;

		const adminUser = process.env.WP_USERNAME || 'admin';
		const adminPass = process.env.WP_PASSWORD || 'admin';
		const token = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');
		headers.Authorization = `Basic ${token}`;
	}

	const defaultData = {
		title: `Test Abstract ${Date.now()}`,
		description: 'This is a test abstract description.',
		event_id: process.env.TEST_EVENT_ID || 1,
		track_id: 1, // Assuming track 1 exists
		status: 1, // Pending
		...abstractData,
	};

	const response = await requestContext.post(
		'/wp-json/simplyconf/v1/abstracts',
		{
			headers: headers,
			data: defaultData,
		}
	);

	if (!response.ok()) {
		console.warn(
			`Failed to create abstract: ${response.status()} ${await response.text()}`
		);
		return null;
	}

	return await response.json();
}

/**
 * Delete an abstract via REST API
 * @param {number} abstractId
 */
async function deleteTestAbstract(abstractId) {
	const context = await request.newContext({
		baseURL: process.env.WP_BASE_URL || 'http://simplyconf.local',
	});

	const adminUser = process.env.WP_USERNAME || 'admin';
	const adminPass = process.env.WP_PASSWORD || 'admin';
	const token = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

	await context.delete(`/wp-json/simplyconf/v1/abstracts/${abstractId}`, {
		headers: {
			Authorization: `Basic ${token}`,
		},
	});
}

module.exports = {
	createTestAbstract,
	deleteTestAbstract,
};
