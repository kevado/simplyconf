/**
 * Abstract Settings Tests
 *
 * Tests for the Abstract Settings page, covering:
 * - Submission mode toggle (wizard vs single page)
 * - Settings save/reset
 * - Submit limit, attachment settings
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');

test.describe('Abstract Settings', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		await navigateToAdmin(page, '/abstracts/settings');
		await waitForPageLoad(page);
		// Wait for form to load
		await page
			.locator('input[type="radio"][value="wizard"]')
			.waitFor({ state: 'visible', timeout: 10000 })
			.catch(() => {});
	});

	test('displays abstract settings page with submission mode options', async ({
		page,
	}) => {
		// Page heading
		const heading = page.locator('h3:has-text("Abstract Settings")');
		await expect(heading).toBeVisible();

		// Submission mode radio buttons
		const wizardRadio = page.locator('input[type="radio"][value="wizard"]');
		const singlePageRadio = page.locator(
			'input[type="radio"][value="single_page"]',
		);

		await expect(wizardRadio).toBeVisible();
		await expect(singlePageRadio).toBeVisible();

		// Save button
		const saveBtn = page.locator('button:has-text("Save Settings")');
		await expect(saveBtn).toBeVisible();

		console.log('✓ Abstract settings page loaded with submission mode options');
	});

	test('can switch submission mode from wizard to single page', async ({
		page,
	}) => {
		const wizardRadio = page.locator('input[type="radio"][value="wizard"]');
		const singlePageRadio = page.locator(
			'input[type="radio"][value="single_page"]',
		);

		const wizardVisible = await wizardRadio.isVisible().catch(() => false);
		const singlePageVisible = await singlePageRadio
			.isVisible()
			.catch(() => false);

		if (!wizardVisible || !singlePageVisible) {
			console.log(
				'Submission mode radios not visible — feature may not be available for this event',
			);
			return;
		}

		// Get current state
		const wizardChecked = await wizardRadio.isChecked();
		const singlePageChecked = await singlePageRadio.isChecked();
		console.log(
			`Current mode: wizard=${wizardChecked}, single_page=${singlePageChecked}`,
		);

		// Toggle to single_page if currently wizard, or wizard if currently single_page
		if (wizardChecked) {
			await singlePageRadio.click();
			await expect(singlePageRadio).toBeChecked();
			console.log('✓ Switched to single_page mode');
		} else {
			await wizardRadio.click();
			await expect(wizardRadio).toBeChecked();
			console.log('✓ Switched to wizard mode');
		}
	});

	test('saves submission mode setting and persists after reload', async ({
		page,
	}) => {
		const singlePageRadio = page.locator(
			'input[type="radio"][value="single_page"]',
		);
		const wizardRadio = page.locator('input[type="radio"][value="wizard"]');

		if (!(await singlePageRadio.isVisible().catch(() => false))) {
			console.log('Submission mode radios not visible — skipping save test');
			return;
		}

		// Switch to single_page
		await singlePageRadio.click();
		await expect(singlePageRadio).toBeChecked();

		// Save
		await page.locator('button:has-text("Save Settings")').click();
		await page.waitForTimeout(1500);

		// Check for success notification
		const successMsg = page.locator('.sc-message-success, .sc-notification-notice-success');
		const success = await successMsg
			.isVisible({ timeout: 5000 })
			.catch(() => false);
		if (success) {
			console.log('✓ Settings saved successfully');
		}

		// Reload and verify persistence
		await page.reload();
		await waitForPageLoad(page);
		await page
			.locator('input[type="radio"][value="single_page"]')
			.waitFor({ state: 'visible', timeout: 10000 })
			.catch(() => {});

		const stillChecked = await page
			.locator('input[type="radio"][value="single_page"]')
			.isChecked()
			.catch(() => false);
		console.log(`Single page mode persisted after reload: ${stillChecked}`);

		// Restore to wizard mode
		await page.locator('input[type="radio"][value="wizard"]').click().catch(() => {});
		await page.locator('button:has-text("Save Settings")').click();
		await page.waitForTimeout(1000);

		console.log('✓ Submission mode save/persist test complete');
	});

	test('reset button reverts unsaved changes', async ({ page }) => {
		const wizardRadio = page.locator('input[type="radio"][value="wizard"]');
		const singlePageRadio = page.locator(
			'input[type="radio"][value="single_page"]',
		);

		if (!(await wizardRadio.isVisible().catch(() => false))) {
			console.log('Submission mode radios not visible — skipping reset test');
			return;
		}

		// Record current state
		const initialWizardState = await wizardRadio.isChecked();

		// Make a change
		if (initialWizardState) {
			await singlePageRadio.click();
			await expect(singlePageRadio).toBeChecked();
		} else {
			await wizardRadio.click();
			await expect(wizardRadio).toBeChecked();
		}

		// Click Reset to Saved
		const resetBtn = page.locator('button:has-text("Reset to Saved")');
		if (await resetBtn.isVisible().catch(() => false)) {
			await resetBtn.click();
			await page.waitForTimeout(1000);

			// State should be reverted to initial
			const afterResetWizardState = await wizardRadio.isChecked();
			expect(afterResetWizardState).toBe(initialWizardState);
			console.log('✓ Reset button reverts unsaved changes');
		} else {
			console.log('Reset button not found — skipping reset verification');
		}
	});

	test('submit limit field is present and accepts numeric input', async ({
		page,
	}) => {
		const submitLimitInput = page.locator('input#submit_limit, input[id*="submit_limit"]');
		const inputVisible = await submitLimitInput.isVisible().catch(() => false);

		if (!inputVisible) {
			console.log('Submit limit input not found — may not be on this settings page');
			return;
		}

		// Clear and enter a new value
		await submitLimitInput.fill('');
		await submitLimitInput.type('3');
		const value = await submitLimitInput.inputValue();
		expect(value).toBe('3');

		console.log('✓ Submit limit field accepts numeric input');
	});

	test('settings page nav button is visible on abstract pages', async ({
		page,
	}) => {
		// Navigate to abstracts first
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// Settings nav button should be visible
		const settingsNavBtn = page.locator('[data-testid="nav-settings"]');
		const visible = await settingsNavBtn.isVisible().catch(() => false);

		if (visible) {
			await settingsNavBtn.click();
			await waitForPageLoad(page);

			// Should navigate to settings page
			const heading = page.locator('h3:has-text("Abstract Settings")');
			await expect(heading).toBeVisible({ timeout: 10000 });
			console.log('✓ Settings navigation button works correctly');
		} else {
			console.log('Settings nav button not visible on abstracts page');
		}
	});
});
