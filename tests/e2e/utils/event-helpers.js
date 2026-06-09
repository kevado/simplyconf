/**
 * Event Helper Utilities for E2E Tests
 *
 * Utilities for selecting and managing events in tests
 */

/**
 * Select an event by dispatching Redux action
 * @param {import('@playwright/test').Page} page
 * @param {number} eventId - Event ID to select (defaults to TEST_EVENT_ID from env)
 */
async function selectEvent(page, eventId = null) {
	const targetEventId =
		eventId || Number.parseInt(process.env.TEST_EVENT_ID || '1', 10);

	await page.evaluate((id) => {
		// Dispatch the Redux action to set globalId
		if (window.simplyconf?.store) {
			window.simplyconf.store.dispatch({
				type: 'events/changeGlobalEvent/fulfilled',
				payload: id,
			});
			console.log(`✓ Selected event ID: ${id}`);
		} else {
			console.warn('Redux store not available');
		}
	}, targetEventId);

	// Wait a bit for state to propagate
	await page.waitForTimeout(500);
}

/**
 * Get the current global event ID
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number|null>}
 */
async function getCurrentEventId(page) {
	return await page.evaluate(() => {
		return window.simplyconf?.store?.getState()?.events?.globalId || null;
	});
}

module.exports = {
	selectEvent,
	getCurrentEventId,
};
