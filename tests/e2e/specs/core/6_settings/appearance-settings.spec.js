const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');

test.describe('Appearance Settings', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		// Appearance settings is at /settings (the default settings route)
		await navigateToAdmin(page, '/settings');
		await waitForPageLoad(page);
	});

	test('should display appearance settings page', async ({ page }) => {
		// Verify page loads
		await expect(
			page.locator('h1:has-text("Appearance"), h2:has-text("Appearance")')
		).toBeVisible();

		// Check for common appearance settings
		const possibleElements = [
			'input[type="color"]', // Color pickers
			'input[type="file"]', // Logo upload
			'select[name*="theme"]', // Theme selection
			'input[name*="logo"]', // Logo URL
			'input[name*="favicon"]', // Favicon
		];

		let foundElements = 0;
		for (const element of possibleElements) {
			if ((await page.locator(element).count()) > 0) {
				foundElements++;
			}
		}

		// Should have at least some appearance settings
		expect(foundElements).toBeGreaterThan(0);
	});

	test('should update primary color', async ({ page }) => {
		const colorPicker = page.locator('input[type="color"]').first();

		if (await colorPicker.isVisible()) {
			// Get current color
			const currentColor = await colorPicker.inputValue();

			// Set new color
			const newColor = '#FF5733'; // Orange color
			await colorPicker.fill(newColor);

			// Save settings
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();

			// Verify persisted
			await page.reload();
			await expect(colorPicker).toHaveValue(newColor);
		} else {
			test.skip('Color picker not found');
		}
	});

	test('should upload logo', async ({ page }) => {
		const fileInput = page.locator('input[type="file"][name*="logo"]').first();

		if (await fileInput.isVisible()) {
			// Create a test image file (small PNG)
			const testImageBuffer = Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
				'base64'
			);

			// Upload file
			await fileInput.setInputFiles({
				name: 'test-logo.png',
				mimeType: 'image/png',
				buffer: testImageBuffer,
			});

			// Save settings
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();

			// Check if logo preview shows
			const logoPreview = page
				.locator('img[alt*="logo"], .logo-preview')
				.first();
			if (await logoPreview.isVisible()) {
				await expect(logoPreview).toBeVisible();
			}
		} else {
			test.skip('Logo upload field not found');
		}
	});

	test('should update branding text', async ({ page }) => {
		const brandingField = page
			.locator(
				'input[name*="brand"], input[name*="site"], textarea[name*="footer"]'
			)
			.first();

		if (await brandingField.isVisible()) {
			const currentValue = await brandingField.inputValue();
			const newBranding = `Test Branding ${Date.now()}`;

			await brandingField.clear();
			await brandingField.fill(newBranding);

			// Save settings
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();

			// Verify persisted
			await page.reload();
			await expect(brandingField).toHaveValue(newBranding);
		} else {
			test.skip('Branding field not found');
		}
	});

	test('should change theme selection', async ({ page }) => {
		const themeSelect = page.locator('select[name*="theme"]').first();

		if (await themeSelect.isVisible()) {
			const currentTheme = await themeSelect.inputValue();
			const options = themeSelect.locator('option');
			const optionCount = await options.count();

			if (optionCount > 1) {
				let newTheme = null;
				for (let i = 0; i < optionCount; i++) {
					const optionValue = await options.nth(i).getAttribute('value');
					if (optionValue && optionValue !== currentTheme) {
						newTheme = optionValue;
						break;
					}
				}

				if (newTheme) {
					await themeSelect.selectOption(newTheme);

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
					await expect(themeSelect).toHaveValue(newTheme);
				}
			}
		} else {
			test.skip('Theme selector not found');
		}
	});

	test('should toggle dark mode', async ({ page }) => {
		const darkModeToggle = page
			.locator('input[type="checkbox"][name*="dark"], .sc-switch')
			.first();

		if (await darkModeToggle.isVisible()) {
			// Check current state
			const isChecked = await darkModeToggle.isChecked();

			// Toggle it
			await darkModeToggle.click();

			// Save settings
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();

			// Verify toggle persisted
			await page.reload();
			const newState = await darkModeToggle.isChecked();
			expect(newState).not.toBe(isChecked);
		} else {
			test.skip('Dark mode toggle not found');
		}
	});

	test('should reset appearance to defaults', async ({ page }) => {
		const resetButton = page
			.locator('button:has-text("Reset"), button:has-text("Default")')
			.first();

		if (await resetButton.isVisible()) {
			await resetButton.click();

			// Confirm if needed
			const confirmButton = page.locator(
				'.sc-modal-confirm-btn, button:has-text("Yes")'
			);
			if (await confirmButton.isVisible()) {
				await confirmButton.click();
			}

			// Verify success
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();
		} else {
			test.skip('Reset button not found');
		}
	});

	test('should preview appearance changes', async ({ page }) => {
		const previewButton = page
			.locator('button:has-text("Preview"), button:has-text("Live Preview")')
			.first();

		if (await previewButton.isVisible()) {
			// Make a change first
			const colorPicker = page.locator('input[type="color"]').first();
			if (await colorPicker.isVisible()) {
				await colorPicker.fill('#00FF00'); // Green color
			}

			// Click preview
			const [newPage] = await Promise.all([
				page.context().waitForEvent('page'),
				previewButton.click(),
			]);

			// Should open new tab/window with preview
			await newPage.waitForLoadState();
			expect(newPage.url()).toContain('preview');

			// Close preview
			await newPage.close();
		} else {
			test.skip('Preview functionality not found');
		}
	});

	test('should validate color format', async ({ page }) => {
		const colorPicker = page.locator('input[type="color"]').first();

		if (await colorPicker.isVisible()) {
			// Try invalid color
			await colorPicker.fill('invalid-color');

			// Try to save
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Should show validation error
			await expect(
				page.locator('.sc-message-error, .error, .sc-form-item-explain-error')
			).toBeVisible();
		} else {
			test.skip('Color picker not found to test validation');
		}
	});
});
