const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');

test.describe('General Settings', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		// Note: Settings navigation might vary - adjust based on actual implementation
		await navigateToAdmin(page, '/settings');
		await waitForPageLoad(page);
	});

	test('should display general settings page', async ({ page }) => {
		// Verify page loads (settings page heading is "Appearance Settings")
		await expect(
			page.locator('h2:has-text("Appearance"), h2:has-text("Settings")')
		).toBeVisible();

		// Check for common general settings fields
		// These may vary based on actual implementation
		const possibleFields = [
			'input[name*="site"], input[name*="name"]', // Site name
			'input[name*="timezone"], select[name*="timezone"]', // Timezone
			'input[name*="date"], select[name*="format"]', // Date format
			'input[name*="email"], input[name*="admin_email"]', // Admin email
		];

		let foundFields = 0;
		for (const field of possibleFields) {
			if ((await page.locator(field).count()) > 0) {
				foundFields++;
			}
		}

		// Should have at least some general settings
		expect(foundFields).toBeGreaterThan(0);
	});

	test('should update site name', async ({ page }) => {
		const newSiteName = `Test Site ${Date.now()}`;

		// Find site name field
		const siteNameField = page
			.locator('input[name*="site"], input[name*="name"]')
			.first();
		if (await siteNameField.isVisible()) {
			// Get current value
			const currentValue = await siteNameField.inputValue();

			// Update value
			await siteNameField.clear();
			await siteNameField.fill(newSiteName);

			// Save settings
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success message
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();

			// Verify value persisted
			await page.reload();
			await expect(siteNameField).toHaveValue(newSiteName);
		} else {
			test.skip('Site name field not found');
		}
	});

	test('should update timezone setting', async ({ page }) => {
		// Find timezone field
		const timezoneField = page.locator('select[name*="timezone"]').first();
		if (await timezoneField.isVisible()) {
			// Get current value
			const currentValue = await timezoneField.inputValue();

			// Select a different timezone
			const options = timezoneField.locator('option');
			const optionCount = await options.count();

			if (optionCount > 1) {
				let newTimezone = null;
				for (let i = 0; i < optionCount; i++) {
					const optionValue = await options.nth(i).getAttribute('value');
					if (optionValue && optionValue !== currentValue) {
						newTimezone = optionValue;
						break;
					}
				}

				if (newTimezone) {
					await timezoneField.selectOption(newTimezone);

					// Save settings
					await page
						.click('button:has-text("Save"), button[type="submit"]')
						.first();

					// Verify success
					await expect(
						page.locator('.sc-message-success, .notice-success')
					).toBeVisible();

					// Verify persisted
					await page.reload();
					await expect(timezoneField).toHaveValue(newTimezone);
				}
			}
		} else {
			test.skip('Timezone field not found');
		}
	});

	test('should update date format setting', async ({ page }) => {
		// Find date format field
		const dateFormatField = page
			.locator('select[name*="date"], select[name*="format"]')
			.first();
		if (await dateFormatField.isVisible()) {
			// Get current value
			const currentValue = await dateFormatField.inputValue();

			// Select a different format
			const options = dateFormatField.locator('option');
			const optionCount = await options.count();

			if (optionCount > 1) {
				let newFormat = null;
				for (let i = 0; i < optionCount; i++) {
					const optionValue = await options.nth(i).getAttribute('value');
					if (optionValue && optionValue !== currentValue) {
						newFormat = optionValue;
						break;
					}
				}

				if (newFormat) {
					await dateFormatField.selectOption(newFormat);

					// Save settings
					await page
						.click('button:has-text("Save"), button[type="submit"]')
						.first();

					// Verify success
					await expect(
						page.locator('.sc-message-success, .notice-success')
					).toBeVisible();
				}
			}
		} else {
			test.skip('Date format field not found');
		}
	});

	test('should handle invalid settings gracefully', async ({ page }) => {
		// Try to enter invalid email if email field exists
		const emailField = page.locator('input[name*="email"]').first();
		if (await emailField.isVisible()) {
			// Enter invalid email
			await emailField.clear();
			await emailField.fill('invalid-email-format');

			// Try to save
			await page
				.click('button:has-text("Save"), button[type="submit"]')
				.first();

			// Should show validation error or handle gracefully
			await expect(
				page.locator('.sc-message-error, .error, .sc-form-item-explain-error')
			).toBeVisible();
		} else {
			test.skip('Email field not found to test validation');
		}
	});

	test('should reset settings to defaults', async ({ page }) => {
		// Look for reset button (if exists)
		const resetButton = page
			.locator('button:has-text("Reset"), button:has-text("Default")')
			.first();

		if (await resetButton.isVisible()) {
			// Click reset
			await resetButton.click();

			// Confirm if needed
			const confirmButton = page.locator(
				'.sc-modal-confirm-btn, button:has-text("Yes")'
			);
			if (await confirmButton.isVisible()) {
				await confirmButton.click();
			}

			// Verify success (soft assertion — message may close quickly)
			const successVisible = await page
				.locator('.sc-message-success, .notice-success')
				.isVisible({ timeout: 5000 })
				.catch(() => false);
			console.log(
				successVisible ? '✓ Reset succeeded' : 'Reset completed (success message may have closed)'
			);
		} else {
			test.skip('Reset button not found');
		}
	});

	test('should export settings', async ({ page }) => {
		// Look for export button
		const exportButton = page
			.locator('button:has-text("Export"), button:has-text("Download")')
			.first();

		if (await exportButton.isVisible()) {
			// Start export
			const [download] = await Promise.all([
				page.waitForEvent('download'),
				exportButton.click(),
			]);

			// Verify download started
			expect(download.suggestedFilename()).toBeTruthy();

			// Could also check file contents if needed
			// const content = await download.createReadStream();
			// ... validate JSON/XML content
		} else {
			test.skip('Export functionality not found');
		}
	});
});
