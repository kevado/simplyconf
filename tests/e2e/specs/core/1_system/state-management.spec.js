/**
 * State Management Tests
 *
 * Tests to validate Redux state management works correctly
 * Verifies Phase 2 ecosystem improvements (dynamic reducer registration)
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const { navigateToAdmin } = require('../../../utils/navigation');

test.describe('Redux Store Availability', () => {
	test('Redux store is available on window.simplyconf', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/events');

		const storeAvailable = await page.evaluate(() => {
			return typeof window.simplyconf?.store !== 'undefined';
		});

		expect(storeAvailable).toBe(true);
	});

	test('Store has getState method', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/events');

		const hasGetState = await page.evaluate(() => {
			return typeof window.simplyconf?.store?.getState === 'function';
		});

		expect(hasGetState).toBe(true);
	});

	test('Store has dispatch method', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/events');

		const hasDispatch = await page.evaluate(() => {
			return typeof window.simplyconf?.store?.dispatch === 'function';
		});

		expect(hasDispatch).toBe(true);
	});
});

test.describe('Core State Slices', () => {
	test('Events state exists', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/events');

		const stateExists = await page.evaluate(() => {
			const state = window.simplyconf?.store?.getState();
			return state?.events !== undefined;
		});

		expect(stateExists).toBe(true);
	});

	test('Abstracts state exists', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/abstracts');

		const stateExists = await page.evaluate(() => {
			const state = window.simplyconf?.store?.getState();
			return state?.abstracts !== undefined;
		});

		expect(stateExists).toBe(true);
	});

	test('Users state exists', async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/users');

		const stateExists = await page.evaluate(() => {
			const state = window.simplyconf?.store?.getState();
			return state?.users !== undefined;
		});

		expect(stateExists).toBe(true);
	});
});
