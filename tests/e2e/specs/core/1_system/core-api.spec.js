/**
 * Core API Tests
 *
 * Tests to validate the Core API (Phase 4 ecosystem improvement)
 * Ensures window.simplyconf.api is available and functional
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const { navigateToAdmin } = require('../../../utils/navigation');

test.describe('Core API Availability', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('Core API is exposed on window.simplyconf', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const apiAvailable = await page.evaluate(() => {
			return typeof window.simplyconf?.api !== 'undefined';
		});

		expect(apiAvailable).toBe(true);
	});

	test('Core API has correct version (1.0.0)', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const version = await page.evaluate(() => {
			return window.simplyconf?.api?.version;
		});

		expect(version).toBe('1.0.0');
	});

	test('Core API version is also on apiVersion property', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const apiVersion = await page.evaluate(() => {
			return window.simplyconf?.apiVersion;
		});

		expect(apiVersion).toBe('1.0.0');
	});

	test('Core API has isCompatible method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.isCompatible === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has registerAddon method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.registerAddon === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has registerReducer method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.registerReducer === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has registerComponents method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.registerComponents === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has registerService method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.registerService === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has getService method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.getService === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has getStore method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.getStore === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has getUtils method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.getUtils === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has getHooks method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.getHooks === 'function';
		});

		expect(hasMethod).toBe(true);
	});

	test('Core API has getState method', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasMethod = await page.evaluate(() => {
			return typeof window.simplyconf?.api?.getState === 'function';
		});

		expect(hasMethod).toBe(true);
	});
});

test.describe('Core API Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('isCompatible returns true for matching version', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const isCompatible = await page.evaluate(() => {
			return window.simplyconf?.api?.isCompatible('1.0.0');
		});

		expect(isCompatible).toBe(true);
	});

	test('isCompatible returns true for lower minor version', async ({
		page,
	}) => {
		await navigateToAdmin(page, '/events');

		const isCompatible = await page.evaluate(() => {
			return window.simplyconf?.api?.isCompatible('1.0.0');
		});

		expect(isCompatible).toBe(true);
	});

	test('isCompatible returns false for different major version', async ({
		page,
	}) => {
		await navigateToAdmin(page, '/events');

		const isCompatible = await page.evaluate(() => {
			return window.simplyconf?.api?.isCompatible('2.0.0');
		});

		expect(isCompatible).toBe(false);
	});

	test('getStore returns Redux store', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const hasStore = await page.evaluate(() => {
			const store = window.simplyconf?.api?.getStore();
			return store && typeof store.getState === 'function';
		});

		expect(hasStore).toBe(true);
	});

	test('Core ready flag is set', async ({ page }) => {
		await navigateToAdmin(page, '/events');

		const coreReady = await page.evaluate(() => {
			return window.simplyconf?.coreReady === true;
		});

		expect(coreReady).toBe(true);
	});
});
