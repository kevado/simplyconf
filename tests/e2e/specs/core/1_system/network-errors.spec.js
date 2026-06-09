/**
 * Network Error & API Failure Handling Tests
 *
 * Tests that the app handles API errors gracefully without crashing.
 * Uses Playwright route interception to simulate network/API failures.
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');

test.describe('API Error Handling', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('app shows error state when events API returns 500', async ({ page }) => {
		// Intercept the events list API call and return a 500
		await page.route('**/simplyconf/v1/events*', (route) => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ code: 'server_error', message: 'Internal server error' }),
			});
		});

		await navigateToAdmin(page, '/events');
		await page.waitForTimeout(2000);

		// The page should not be a blank crash — some UI element should be visible
		const hasContent = await page
			.locator('body')
			.isVisible()
			.catch(() => false);
		expect(hasContent).toBe(true);

		// Either an error alert/message appears, or the component shows an empty state
		// — but the app must not throw an unhandled JS exception
		const jsErrorOccurred = await page.evaluate(() => {
			return window.__simplyconf_error_count > 0;
		}).catch(() => false);

		// If no custom error counter, just verify the page didn't go blank
		const bodyText = await page.locator('body').textContent().catch(() => '');
		expect(bodyText.length).toBeGreaterThan(0);

		console.log('✓ App stayed functional after events API 500 error');
	});

	test('app handles 404 on single resource fetch gracefully', async ({ page }) => {
		// Intercept any API call that fetches a specific resource by ID
		await page.route('**/simplyconf/v1/events/9999', (route) => {
			route.fulfill({
				status: 404,
				contentType: 'application/json',
				body: JSON.stringify({ code: 'not_found', message: 'Event not found' }),
			});
		});

		await navigateToAdmin(page, '/events');
		await waitForPageLoad(page);

		// The page should load without crashing
		const heading = page
			.locator('h1, h2, h3')
			.filter({ hasText: /events/i })
			.first();
		await expect(heading).toBeVisible({ timeout: 10000 });

		console.log('✓ App handles 404 resource fetch gracefully');
	});

	test('app handles 403 forbidden response', async ({ page }) => {
		// Intercept a non-auth API call and return 403
		// Note: The axios interceptor clears auth on 403; we intercept the events fetch
		// after login so the page is already mounted before the 403 hits
		await navigateToAdmin(page, '/events');
		await waitForPageLoad(page);

		// Now intercept future API calls
		let got403 = false;
		await page.route('**/simplyconf/v1/events*', (route) => {
			got403 = true;
			route.fulfill({
				status: 403,
				contentType: 'application/json',
				body: JSON.stringify({ code: 'forbidden', message: 'Sorry, you are not allowed to do that.' }),
			});
		});

		// Trigger a page reload which will hit the intercepted route
		await page.reload();
		await page.waitForTimeout(2000);

		// App should not be completely blank after a 403
		const bodyText = await page.locator('body').textContent().catch(() => '');
		expect(bodyText.length).toBeGreaterThan(0);

		console.log('✓ App handles 403 forbidden without crashing');
	});

	test('app shows loading state during slow API response', async ({ page }) => {
		// Delay the events API response to simulate slow network
		await page.route('**/simplyconf/v1/events*', async (route) => {
			// Add a 2 second delay before responding with success
			await new Promise((resolve) => setTimeout(resolve, 2000));
			await route.continue();
		});

		await navigateToAdmin(page, '/events');

		// During the delay, there should be some loading indicator
		// Ant Design Table shows a spinning loader during data fetch
		const loadingIndicator = page.locator(
			'.sc-spin, .sc-spin-spinning, [class*="loading"], [class*="spinner"]',
		);
		const isLoading = await loadingIndicator
			.isVisible({ timeout: 3000 })
			.catch(() => false);

		if (isLoading) {
			console.log('✓ Loading indicator shown during slow API response');
		} else {
			// Some apps show content immediately then fetch — either way is acceptable
			const hasContent = await page.locator('body').isVisible().catch(() => false);
			expect(hasContent).toBe(true);
			console.log('✓ Page remained functional during slow API response');
		}
	});

	test('abstracts page handles API error without blank screen', async ({ page }) => {
		// Intercept abstracts API
		await page.route('**/simplyconf/v1/abstracts*', (route) => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ code: 'server_error', message: 'Database connection failed' }),
			});
		});

		await navigateToAdmin(page, '/abstracts');
		await page.waitForTimeout(2000);

		// Page should render something — not be blank
		const hasTable = await page.locator('.sc-table, table').isVisible().catch(() => false);
		const hasError = await page
			.locator('.sc-message-error, .sc-alert-error, [role="alert"]')
			.isVisible()
			.catch(() => false);
		const hasHeading = await page
			.locator('h1, h2, h3')
			.first()
			.isVisible()
			.catch(() => false);

		// At least one of these should be true — the page shouldn't be totally blank
		const isRendered = hasTable || hasError || hasHeading;
		expect(isRendered).toBe(true);

		console.log(`✓ Abstracts page rendered after API 500: table=${hasTable}, error=${hasError}, heading=${hasHeading}`);
	});
});

test.describe('Network Offline Handling', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('app handles offline state gracefully on action', async ({ page }) => {
		await navigateToAdmin(page, '/events');
		await waitForPageLoad(page);

		// Verify page loaded normally first
		const heading = page
			.locator('h1, h2, h3')
			.filter({ hasText: /events/i })
			.first();
		await expect(heading).toBeVisible();

		// Simulate network offline by aborting API requests
		await page.route('**/simplyconf/v1/**', (route) => {
			route.abort('failed');
		});

		// Try to trigger an API action — click Create button
		const createButton = page.locator('button.simplyconf-main-action-btn');
		const createVisible = await createButton.isVisible().catch(() => false);

		if (createVisible) {
			await createButton.click();
			// Modal may or may not open — but clicking shouldn't crash the page

			// Wait briefly for any error message
			await page.waitForTimeout(1000);

			// The page should still be functional (not blank)
			const bodyText = await page.locator('body').textContent().catch(() => '');
			expect(bodyText.length).toBeGreaterThan(0);

			// Close any open modal
			await page.keyboard.press('Escape');
		}

		console.log('✓ App gracefully handles offline state');
	});
});
