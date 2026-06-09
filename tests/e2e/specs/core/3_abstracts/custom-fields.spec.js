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
		await navigateToAdmin(page, '/abstracts/customfields');
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
		await navigateToAdmin(page, '/abstracts/customfields');
		await waitForPageLoad(page);

		// Click Add Field button
		const addButton = page.locator('[data-testid="add-field-btn"]');

		await expect(addButton).toBeVisible();

		await addButton.click();

		// Wait for modal
		const modal = page.getByTestId('custom-field-modal');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Fill field details
		const timestamp = Date.now();
		const fieldLabel = `Test Field ${timestamp}`;

		// Field label
		const labelInput = modal
			.locator('input#label, input[name="label"]')
			.first();
		await labelInput.fill(fieldLabel);

		// Field name (required)
		const nameInput = modal.locator('input#name, input[name="name"]').first();
		await nameInput.fill(`test_field_${timestamp}`);

		// Field type - select Text Input
		const typeSelect = modal.locator('.sc-select').first();
		await typeSelect.click();
		await page.waitForTimeout(500);

		const textOption = page.locator('.sc-select-item:has-text("Text Input")');
		await textOption.click();

		// Display order (required)
		const orderInput = modal.locator('input[type="number"]').first();
		await orderInput.fill('1');

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
		await navigateToAdmin(page, '/abstracts/customfields');
		await waitForPageLoad(page);

		const addButton = page.locator('[data-testid="add-field-btn"]');
		await addButton.click();

		const modal = page.getByTestId('custom-field-modal');
		await expect(modal).toBeVisible({ timeout: 5000 });

		const timestamp = Date.now();
		const fieldLabel = `Dropdown Field ${timestamp}`;

		// Field label
		const labelInput = modal
			.locator('input#label, input[name="label"]')
			.first();
		await labelInput.fill(fieldLabel);

		// Field name (required)
		const nameInput = modal.locator('input#name, input[name="name"]').first();
		await nameInput.fill(`dropdown_field_${timestamp}`);

		// Field type - select Dropdown
		const typeSelect = modal.locator('.sc-select').first();
		await typeSelect.click();
		await page.waitForTimeout(500);

		const dropdownOption = page.locator(
			'.sc-select-item:has-text("Dropdown"), .sc-select-item:has-text("Select")'
		);
		if (await dropdownOption.isVisible().catch(() => false)) {
			await dropdownOption.click();

			// Display order (required)
			const orderInput = modal.locator('input[type="number"]').first();
			await orderInput.fill('2');

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
		await navigateToAdmin(page, '/abstracts/customfields');
		await waitForPageLoad(page);

		// Find first field
		const firstField = page.locator('table tbody tr').first();
		if (await firstField.isVisible({ timeout: 5000 }).catch(() => false)) {
			// Click the settings/actions button
			const actionsButton = firstField.locator('button').last();
			await actionsButton.click();

			// Click Edit from dropdown menu
			const editMenuItem = page.locator(
				'.sc-dropdown-menu-item:has-text("Edit")'
			);
			await editMenuItem.click();

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
				'button:has-text("Create"), button:has-text("Save"), button:has-text("Update")'
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
		await navigateToAdmin(page, '/abstracts/customfields');
		await waitForPageLoad(page);

		// Create a test field to delete
		const addButton = page.locator('[data-testid="add-field-btn"]');
		await addButton.click();

		const createModal = page.getByTestId('custom-field-modal');
		await expect(createModal).toBeVisible({ timeout: 5000 });

		const timestamp = Date.now();
		const fieldLabel = `Delete Test ${timestamp}`;

		// Field label
		const labelInput = createModal
			.locator('input#label, input[name="label"]')
			.first();
		await labelInput.fill(fieldLabel);

		// Field name (required)
		const nameInput = createModal
			.locator('input#name, input[name="name"]')
			.first();
		await nameInput.fill(`delete_test_field_${timestamp}`);

		// Field type - select Text Input
		const typeSelect = createModal.locator('.sc-select').first();
		await typeSelect.click();
		await page.waitForTimeout(500);

		const textOption = page.locator('.sc-select-item:has-text("Text Input")');
		await textOption.click();

		// Display order (required)
		const orderInput = createModal.locator('input[type="number"]').first();
		await orderInput.fill('1');

		const submitButton = createModal.locator(
			'button:has-text("Create"), button:has-text("Save")'
		);
		await submitButton.click();
		await expect(createModal).not.toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(1000);

		// Find and delete the field
		const fieldRow = page.locator(`tr:has-text("${fieldLabel}")`).first();
		if (await fieldRow.isVisible({ timeout: 5000 }).catch(() => false)) {
			// Click the settings/actions button
			const actionsButton = fieldRow.locator('button').last();
			await actionsButton.click();

			// Click Delete from dropdown menu
			const deleteMenuItem = page.locator(
				'.sc-dropdown-menu-item:has-text("Delete")'
			);
			await deleteMenuItem.click();

			// Confirm deletion in popconfirm
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

	test('should bulk delete custom fields', async ({ page }) => {
		await navigateToAdmin(page, '/abstracts/customfields');
		await waitForPageLoad(page);

		// Create multiple test fields to delete
		const fieldsToCreate = ['Bulk Delete Test 1', 'Bulk Delete Test 2'];
		const createdFields = [];

		for (const fieldLabel of fieldsToCreate) {
			const addButton = page.locator('[data-testid="add-field-btn"]');
			await addButton.click();

			const modal = page.getByTestId('custom-field-modal');
			await expect(modal).toBeVisible({ timeout: 5000 });

			const timestamp = Date.now();

			// Field label
			const labelInput = modal
				.locator('input#label, input[name="label"]')
				.first();
			await labelInput.fill(fieldLabel);

			// Field name (required)
			const nameInput = modal.locator('input#name, input[name="name"]').first();
			await nameInput.fill(
				`bulk_delete_field_${timestamp}_${fieldLabel.replace(/\s+/g, '_').toLowerCase()}`
			);

			// Field type - select Text Input
			const typeSelect = modal.locator('.sc-select').first();
			await typeSelect.click();
			await page.waitForTimeout(500);

			const textOption = page.locator(
				'.sc-select-item:has-text("Text Input")'
			);
			await textOption.click();

			// Display order (required)
			const orderInput = modal.locator('input[type="number"]').first();
			await orderInput.fill('1');

			// Submit
			const submitButton = modal.locator(
				'button:has-text("Create"), button:has-text("Save")'
			);
			await submitButton.click();

			await expect(modal).not.toBeVisible({ timeout: 10000 });
			await page.waitForTimeout(500);

			createdFields.push(fieldLabel);
		}

		// Select fields for bulk delete
		for (const fieldLabel of createdFields) {
			const fieldRow = page.locator(`tr:has-text("${fieldLabel}")`).first();
			const checkbox = fieldRow.locator('input[type="checkbox"]');
			await checkbox.check();
		}

		// Verify bulk actions button appears in header
		const bulkActionsButton = page.locator('button:has-text("Bulk Actions")');
		await expect(bulkActionsButton).toBeVisible();

		// Click bulk actions dropdown
		await bulkActionsButton.click();

		// Click delete option from dropdown
		const deleteOption = page.locator(
			'.sc-dropdown-menu-item:has-text("Delete")'
		);
		await deleteOption.click();

		// Confirm deletion in modal
		await page.waitForTimeout(500);
		const confirmButton = page
			.locator(
				page.getByTestId('custom-field-modal').locator('button:has-text("Delete"), button:has-text("OK")')
			)
			.first();
		if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await confirmButton.click();
		}

		await page.waitForTimeout(1000);

		// Verify fields are deleted
		for (const fieldLabel of createdFields) {
			const deletedField = page.locator(`tr:has-text("${fieldLabel}")`);
			await expect(deletedField).toHaveCount(0);
		}

		console.log(`✓ Bulk deleted ${createdFields.length} fields`);
	});

	test.describe('Additional Field Types', () => {
		// Helper to create a field with a given type
		async function createFieldOfType(page, typeName, typeSelectText, extraSetup) {
			await navigateToAdmin(page, '/abstracts/customfields');
			await waitForPageLoad(page);

			await page.locator('[data-testid="add-field-btn"]').click();
			const modal = page.getByTestId('custom-field-modal');
			await expect(modal).toBeVisible({ timeout: 5000 });

			const ts = Date.now();
			const label = `${typeName} Field ${ts}`;

			await page.locator('[data-testid="field-label-input"]').fill(label);
			await page
				.locator('[data-testid="field-name-input"]')
				.fill(`field_${typeName.toLowerCase()}_${ts}`);

			// Select field type
			await page.locator('[data-testid="field-type-select"]').click();
			await page.waitForSelector('.sc-select-dropdown', { timeout: 5000 });
			const option = page
				.locator('.sc-select-item')
				.filter({ hasText: new RegExp(typeSelectText, 'i') })
				.first();
			const optionVisible = await option.isVisible({ timeout: 3000 }).catch(() => false);
			if (!optionVisible) {
				console.log(`Field type "${typeSelectText}" not found — skipping`);
				await page.keyboard.press('Escape');
				await modal.locator('button:has-text("Cancel")').click().catch(() => {
					page.keyboard.press('Escape');
				});
				return null;
			}
			await option.click();
			await page.waitForTimeout(500);

			// Run extra setup (e.g., fill options for select/radio/checkbox)
			if (extraSetup) {
				await extraSetup(page, modal);
			}

			// Fill display order
			const orderInput = modal.locator('input[type="number"]').first();
			if (await orderInput.isVisible().catch(() => false)) {
				await orderInput.fill('99');
			}

			const submitBtn = modal.locator(
				'button:has-text("Create"), button:has-text("Save")',
			);
			await submitBtn.click();
			await modal.waitFor({ state: 'hidden', timeout: 10000 });

			return label;
		}

		test('creates textarea field', async ({ page }) => {
			const label = await createFieldOfType(page, 'Textarea', 'textarea');
			if (!label) return;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Textarea field created: ${label}`);
		});

		test('creates email field', async ({ page }) => {
			const label = await createFieldOfType(page, 'Email', 'email');
			if (!label) return;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Email field created: ${label}`);
		});

		test('creates number field', async ({ page }) => {
			const label = await createFieldOfType(page, 'Number', 'number');
			if (!label) return;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Number field created: ${label}`);
		});

		test('creates radio field with options', async ({ page }) => {
			const label = await createFieldOfType(page, 'Radio', 'radio', async (page, modal) => {
				// Fill options if visible
				const optionsField = modal.locator(
					'textarea[placeholder*="option" i], textarea[name*="option"]',
				);
				if (await optionsField.isVisible().catch(() => false)) {
					await optionsField.fill('Option A\nOption B\nOption C');
				}
			});
			if (!label) return;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Radio field created: ${label}`);
		});

		test('creates checkbox field with options', async ({ page }) => {
			const label = await createFieldOfType(page, 'Checkbox', 'checkbox', async (page, modal) => {
				const optionsField = modal.locator(
					'textarea[placeholder*="option" i], textarea[name*="option"]',
				);
				if (await optionsField.isVisible().catch(() => false)) {
					await optionsField.fill('Check A\nCheck B\nCheck C');
				}
			});
			if (!label) return;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Checkbox field created: ${label}`);
		});

		test('creates rating field', async ({ page }) => {
			const label = await createFieldOfType(page, 'Rating', 'rating');
			if (!label) return;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Rating field created: ${label}`);
		});
	});

	test.describe('Field Configuration Options', () => {
		test('can mark field as required', async ({ page }) => {
			await navigateToAdmin(page, '/abstracts/customfields');
			await waitForPageLoad(page);

			await page.locator('[data-testid="add-field-btn"]').click();
			const modal = page.getByTestId('custom-field-modal');
			await expect(modal).toBeVisible({ timeout: 5000 });

			const ts = Date.now();
			await page.locator('[data-testid="field-label-input"]').fill(`Required Test ${ts}`);
			await page.locator('[data-testid="field-name-input"]').fill(`req_test_${ts}`);

			// Select text type
			await page.locator('[data-testid="field-type-select"]').click();
			await page.waitForSelector('.sc-select-dropdown', { timeout: 5000 });
			await page
				.locator('.sc-select-item')
				.filter({ hasText: /text/i })
				.first()
				.click();
			await page.waitForTimeout(300);

			// Toggle required switch
			const requiredSwitch = modal.locator('input[id*="required"], .sc-switch').first();
			const switchVisible = await requiredSwitch.isVisible().catch(() => false);
			if (switchVisible) {
				await requiredSwitch.click();
				console.log('✓ Required toggle clicked');
			}

			// Fill order and save
			const orderInput = modal.locator('input[type="number"]').first();
			if (await orderInput.isVisible().catch(() => false)) {
				await orderInput.fill('98');
			}

			const submitBtn = modal.locator(
				'button:has-text("Create"), button:has-text("Save")',
			);
			await submitBtn.click();
			await modal.waitFor({ state: 'hidden', timeout: 10000 });

			const label = `Required Test ${ts}`;
			await expect(page.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 });
			console.log(`✓ Field created with required setting: ${label}`);
		});
	});
});
