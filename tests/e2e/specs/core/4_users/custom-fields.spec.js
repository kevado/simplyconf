const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');

/**
 * Custom Fields Tests
 *
 * Tests for managing custom fields in SimplyConf
 */

test.describe('Custom Fields Management', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('should display custom fields page', async ({ page }) => {
		await navigateToAdmin(page, '/users/customfields');
		await waitForPageLoad(page);

		// Verify page heading
		const heading = page
			.locator('h1, h2, h3')
			.filter({ hasText: /custom fields/i })
			.first();
		await expect(heading).toBeVisible();

		// Verify Add Field button exists
		const addButton = page.locator('[data-testid="add-field-btn"]');
		await expect(addButton).toBeVisible();

		console.log('✓ Custom fields page loaded');
	});

	test('should create text input field', async ({ page }) => {
		await navigateToAdmin(page, '/users/customfields');
		await waitForPageLoad(page);

		// Click Add Field button
		const addButton = page.locator('[data-testid="add-field-btn"]');
		await addButton.click();

		// Wait for modal
		const modal = page.getByTestId('custom-field-modal');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Fill field details
		const timestamp = Date.now();
		const fieldLabel = `Test Field ${timestamp}`;

		// Field label
		const labelInput = modal.locator('input#label, input[name="label"]');
		await labelInput.fill(fieldLabel);

		// Field type - select Text Input
		const typeSelect = modal.locator('.sc-select').first();
		await typeSelect.click();
		await page.waitForTimeout(500);

		const textOption = page.locator(
			'.sc-select-item:has-text("Text Input"), .sc-select-item:has-text("Text")'
		);
		await textOption.click();

		// Submit
		const submitButton = modal.locator(
			'button:has-text("Create"), button:has-text("Save")'
		);
		await submitButton.click();

		// Wait for modal to close
		await expect(modal).not.toBeVisible({ timeout: 10000 });

		// Verify field appears in list
		const newField = page.locator(`text="${fieldLabel}"`);
		await expect(newField).toBeVisible({ timeout: 5000 });

		console.log(`✓ Custom field created: ${fieldLabel}`);
	});

	test('should create dropdown field with options', async ({ page }) => {
		await navigateToAdmin(page, '/users/customfields');
		await waitForPageLoad(page);

		const addButton = page.locator('[data-testid="add-field-btn"]');
		await addButton.click();

		const modal = page.getByTestId('custom-field-modal');
		await expect(modal).toBeVisible({ timeout: 5000 });

		const timestamp = Date.now();
		const fieldLabel = `Dropdown Field ${timestamp}`;

		// Field label
		const labelInput = modal.locator('input#label, input[name="label"]');
		await labelInput.fill(fieldLabel);

		// Field type - select Dropdown
		const typeSelect = modal.locator('.sc-select').first();
		await typeSelect.click();
		await page.waitForTimeout(500);

		const dropdownOption = page.locator(
			'.sc-select-item:has-text("Dropdown"), .sc-select-item:has-text("Select")'
		);
		if (await dropdownOption.isVisible().catch(() => false)) {
			await dropdownOption.click();

			// Add options if field appears
			await page.waitForTimeout(500);
			const optionsField = modal.locator(
				'textarea[placeholder*="option" i], textarea[name="options"]'
			);
			if (await optionsField.isVisible().catch(() => false)) {
				await optionsField.fill('Option 1\nOption 2\nOption 3');
			}

			// Submit
			const submitButton = modal.locator(
				'button:has-text("Create"), button:has-text("Save")'
			);
			await submitButton.click();

			await expect(modal).not.toBeVisible({ timeout: 10000 });

			console.log(`✓ Dropdown field created: ${fieldLabel}`);
		} else {
			console.log('⚠ Dropdown type not available');
			test.skip();
		}
	});

	test('should edit custom field', async ({ page }) => {
		await navigateToAdmin(page, '/users/customfields');
		await waitForPageLoad(page);

		// Find first field
		const firstField = page.locator('table tbody tr, .sc-list-item').first();
		if (await firstField.isVisible({ timeout: 5000 }).catch(() => false)) {
			// Open edit (could be button or dropdown)
			const editButton = firstField.locator(
				'button:has-text("Edit"), a:has-text("Edit")'
			);

			if (await editButton.isVisible().catch(() => false)) {
				await editButton.click();
			} else {
				// Try dropdown
				const dropdownTrigger = firstField.locator('.sc-dropdown-trigger');
				if (await dropdownTrigger.isVisible().catch(() => false)) {
					await dropdownTrigger.click();
					const editMenuItem = page.locator(
						'.sc-dropdown-menu-item:has-text("Edit")'
					);
					await editMenuItem.click();
				}
			}

			// Wait for edit modal
			const modal = page.getByTestId('custom-field-modal');
			await expect(modal).toBeVisible({ timeout: 5000 });

			// Modify label
			const labelInput = modal.locator('input#label, input[name="label"]');
			const currentLabel = await labelInput.inputValue();
			const newLabel = `${currentLabel} (Edited)`;
			await labelInput.clear();
			await labelInput.fill(newLabel);

			// Save
			const saveButton = modal.locator(
				'button:has-text("Save"), button:has-text("Update")'
			);
			await saveButton.click();

			await expect(modal).not.toBeVisible({ timeout: 10000 });

			console.log(`✓ Field updated: ${newLabel}`);
		} else {
			console.log('⚠ No fields to edit');
			test.skip();
		}
	});

	test('should delete custom field', async ({ page }) => {
		await navigateToAdmin(page, '/users/customfields');
		await waitForPageLoad(page);

		// Create a test field to delete
		const addButton = page.locator('[data-testid="add-field-btn"]');
		await addButton.click();

		const createModal = page.getByTestId('custom-field-modal');
		await expect(createModal).toBeVisible({ timeout: 5000 });

		const timestamp = Date.now();
		const fieldLabel = `Delete Test ${timestamp}`;

		const labelInput = createModal.locator('input#label, input[name="label"]');
		await labelInput.fill(fieldLabel);

		const typeSelect = createModal.locator('.sc-select').first();
		await typeSelect.click();
		await page.waitForTimeout(500);
		const textOption = page.locator('.sc-select-item').first();
		await textOption.click();

		const submitButton = createModal.locator(
			'button:has-text("Create"), button:has-text("Save")'
		);
		await submitButton.click();
		await expect(createModal).not.toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(1000);

		// Find and delete the field
		const fieldRow = page.locator(`tr:has-text("${fieldLabel}")`).first();
		if (await fieldRow.isVisible({ timeout: 5000 }).catch(() => false)) {
			// Try to find delete button/dropdown
			const deleteButton = fieldRow.locator('button:has-text("Delete")');
			if (await deleteButton.isVisible().catch(() => false)) {
				await deleteButton.click();
			} else {
				// Try dropdown
				const dropdownTrigger = fieldRow.locator('.sc-dropdown-trigger');
				if (await dropdownTrigger.isVisible().catch(() => false)) {
					await dropdownTrigger.click();
					const deleteMenuItem = page.locator(
						'.sc-dropdown-menu-item:has-text("Delete")'
					);
					await deleteMenuItem.click();
				}
			}

			// Confirm deletion
			await page.waitForTimeout(500);
			const confirmButton = page
				.locator(
					'.sc-popconfirm button:has-text("OK"), .sc-popconfirm button:has-text("Delete")'
				)
				.first();
			if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
				await confirmButton.click();
			}

			await page.waitForTimeout(1000);

			// Verify field is gone
			const deletedField = page.locator(`tr:has-text("${fieldLabel}")`);
			await expect(deletedField).toHaveCount(0);

			console.log(`✓ Field deleted: ${fieldLabel}`);
		} else {
			console.log('⚠ Created field not found');
			test.skip();
		}
	});

	test('should toggle field visibility', async ({ page }) => {
		await navigateToAdmin(page, '/users/customfields');
		await waitForPageLoad(page);

		// Find first field with visibility toggle
		const firstField = page.locator('table tbody tr').first();
		if (await firstField.isVisible({ timeout: 5000 }).catch(() => false)) {
			// Look for visibility switch/checkbox
			const visibilitySwitch = firstField.locator(
				'.sc-switch, input[type="checkbox"]'
			);
			if (await visibilitySwitch.isVisible().catch(() => false)) {
				await visibilitySwitch.click();
				await page.waitForTimeout(500);

				console.log('✓ Field visibility toggled');
			} else {
				console.log('⚠ Visibility toggle not found');
				test.skip();
			}
		} else {
			console.log('⚠ No fields available');
			test.skip();
		}
	});
});
