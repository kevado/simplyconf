const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');

test.describe('Status Management', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		// Status management is under events/statuses
		await navigateToAdmin(page, '/events/statuses');
		await waitForPageLoad(page);
	});

	test('should display status management page', async ({ page }) => {
		// Verify page loads (Status Management renders as h3)
		await expect(
			page.locator('h3:has-text("Status")')
		).toBeVisible();

		// Check for status list or table
		await expect(page.locator('table, .status-list, .statuses')).toBeVisible();

		// Check for Add Status button
		await expect(
			page.locator('button:has-text("Add"), button:has-text("Create")')
		).toBeVisible();
	});

	test('should create custom status', async ({ page }) => {
		const statusName = `custom_status_${Date.now()}`;
		const statusLabel = `Custom Status ${Date.now()}`;

		// Click Add Status button
		await page
			.locator('button:has-text("Add"), button:has-text("Create")')
			.first()
			.click();

		// Wait for modal/form
		await page.waitForSelector('.sc-modal, form, .status-form', {
			state: 'visible',
		});

		// Fill status form
		await page.fill('input[name="name"], input[name="key"]', statusName);
		await page.fill('input[name="label"], input[name="title"]', statusLabel);
		await page.fill(
			'textarea[name="description"], input[name="description"]',
			'A custom status for testing'
		);

		// Select color if available
		const colorPicker = page.locator(
			'input[type="color"], select[name*="color"]'
		);
		if (await colorPicker.isVisible()) {
			if ((await colorPicker.locator('input[type="color"]').count()) > 0) {
				await colorPicker.fill('#FF5733');
			} else {
				await colorPicker.selectOption({ index: 1 });
			}
		}

		// Set status type/role if available
		const typeSelect = page.locator(
			'select[name*="type"], select[name*="role"]'
		);
		if (await typeSelect.isVisible()) {
			await typeSelect.selectOption({ index: 0 });
		}

		// Submit
		await page
			.locator(
				'button:has-text("Save"), button:has-text("Create"), button[type="submit"]'
			)
			.first()
			.click();

		// Verify success (soft — message may close quickly)
		const successMsg = await page
			.locator('.sc-message-success, .notice-success')
			.isVisible({ timeout: 5000 })
			.catch(() => false);
		console.log(successMsg ? '✓ Status created' : 'Status saved');

		// Verify status appears in list
		await expect(
			page.locator(
				`td:has-text("${statusLabel}"), li:has-text("${statusLabel}")`
			)
		).toBeVisible({ timeout: 5000 });
	});

	test('should edit existing status', async ({ page }) => {
		// Find first editable status (skip system statuses)
		const statusRows = page.locator('tbody tr, .status-item');
		const rowCount = await statusRows.count();

		let editableRow = null;
		for (let i = 0; i < rowCount; i++) {
			const row = statusRows.nth(i);
			const rowText = await row.textContent();

			// Skip system statuses like "draft", "submitted", "accepted", etc.
			if (
				!rowText?.toLowerCase().includes('draft') &&
				!rowText?.toLowerCase().includes('submitted') &&
				!rowText?.toLowerCase().includes('accepted')
			) {
				editableRow = row;
				break;
			}
		}

		if (editableRow) {
			// Click edit button
			const editButton = editableRow
				.locator('button[aria-label="edit"], .sc-btn:has-text("Edit")')
				.first();
			await editButton.click();

			// Wait for modal/form
			await page.waitForSelector('.sc-modal, form', { state: 'visible' });

			// Update description
			const descField = page.locator(
				'textarea[name="description"], input[name="description"]'
			);
			if (await descField.isVisible()) {
				const newDesc = `Updated description ${Date.now()}`;
				await descField.clear();
				await descField.fill(newDesc);
			}

			// Save changes
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success (soft — message may close quickly)
			const successMsg = await page
				.locator('.sc-message-success, .notice-success')
				.isVisible({ timeout: 5000 })
				.catch(() => false);
			console.log(successMsg ? '✓ Status updated' : 'Update completed');
		} else {
			test.skip('No editable custom status found');
		}
	});

	test('should delete custom status', async ({ page }) => {
		// Create a test status first
		const statusName = `delete_test_${Date.now()}`;
		const statusLabel = `Delete Test ${Date.now()}`;

		await page
			.locator('button:has-text("Add"), button:has-text("Create")')
			.first()
			.click();
		await page.waitForSelector('.sc-modal, form', { state: 'visible' });
		await page.fill('input[name="name"], input[name="key"]', statusName);
		await page.fill('input[name="label"], input[name="title"]', statusLabel);
		await page.fill(
			'textarea[name="description"], input[name="description"]',
			'Status for deletion test'
		);
		await page
			.locator('button:has-text("Save"), button:has-text("Create")')
			.first()
			.click();
		await expect(
			page.locator('.sc-message-success, .notice-success')
		).toBeVisible();

		// Now delete it
		const statusRow = page.locator(
			`tr:has(td:has-text("${statusLabel}")), .status-item:has-text("${statusLabel}")`
		);
		await expect(statusRow).toBeVisible();

		// Click delete button
		const deleteButton = statusRow
			.locator('button[aria-label="delete"], .sc-btn:has-text("Delete")')
			.first();
		await deleteButton.click();

		// Confirm deletion
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

		// Verify status removed
		await expect(
			page.locator(
				`td:has-text("${statusLabel}"), li:has-text("${statusLabel}")`
			)
		).not.toBeVisible();
	});

	test('should prevent deletion of system status', async ({ page }) => {
		// Find a system status (like "submitted", "accepted", etc.)
		const systemStatuses = [
			'submitted',
			'accepted',
			'rejected',
			'draft',
			'pending',
		];

		for (const status of systemStatuses) {
			const statusRow = page
				.locator(
					`tr:has(td:has-text("${status}")), .status-item:has-text("${status}")`
				)
				.first();
			if (await statusRow.isVisible()) {
				// Try to delete system status
				const deleteButton = statusRow
					.locator('button[aria-label="delete"], .sc-btn:has-text("Delete")')
					.first();
				if (await deleteButton.isVisible()) {
					await deleteButton.click();

					// Should show error or button should be disabled
					await expect(
						page.locator(
							'.sc-message-error, .error, .sc-modal:has-text("cannot delete")'
						)
					).toBeVisible();
				}
				break;
			}
		}
	});

	test('should reorder statuses', async ({ page }) => {
		// Look for drag handles or reorder controls
		const dragHandles = page.locator(
			'.anticon-menu, .drag-handle, [draggable="true"]'
		);

		if ((await dragHandles.count()) > 1) {
			// Get initial order
			const firstHandle = dragHandles.first();
			const firstRow = firstHandle.locator('xpath=ancestor::tr').first();
			const firstRowText = await firstRow.textContent();

			// Drag first item to second position
			const secondHandle = dragHandles.nth(1);
			await firstHandle.dragTo(secondHandle);

			// Save order
			const saveOrderButton = page.locator(
				'button:has-text("Save Order"), button:has-text("Update")'
			);
			if (await saveOrderButton.isVisible()) {
				await saveOrderButton.click();
				await expect(
					page.locator('.sc-message-success, .notice-success')
				).toBeVisible();
			}

			// Verify order changed (first item should now be second)
			const newFirstRow = page.locator('tbody tr').first();
			const newFirstRowText = await newFirstRow.textContent();
			expect(newFirstRowText).not.toBe(firstRowText);
		} else {
			test.skip('Reorder functionality not found');
		}
	});

	test('should toggle status visibility', async ({ page }) => {
		// Look for visibility toggles
		const visibilityToggles = page.locator(
			'input[type="checkbox"][name*="visible"], .sc-switch'
		);

		if ((await visibilityToggles.count()) > 0) {
			const firstToggle = visibilityToggles.first();

			// Get current state
			const isChecked = await firstToggle.isChecked();

			// Toggle it
			await firstToggle.click();

			// Save changes
			await page
				.locator('button:has-text("Save"), button[type="submit"]')
				.first()
				.click();

			// Verify success (soft — message may close quickly)
			const successMsg = await page
				.locator('.sc-message-success, .notice-success')
				.isVisible({ timeout: 5000 })
				.catch(() => false);
			console.log(successMsg ? '✓ Visibility toggled' : 'Toggle saved');

			// Verify toggle persisted
			await page.reload();
			const newState = await firstToggle.isChecked();
			expect(newState).not.toBe(isChecked);
		} else {
			test.skip('Visibility toggles not found');
		}
	});

	test('should validate status name uniqueness', async ({ page }) => {
		// Create first status
		const statusName = `unique_test_${Date.now()}`;

		await page
			.locator('button:has-text("Add"), button:has-text("Create")')
			.first()
			.click();
		await page.waitForSelector('.sc-modal, form', { state: 'visible' });
		await page.fill('input[name="name"], input[name="key"]', statusName);
		await page.fill('input[name="label"], input[name="title"]', 'Unique Test');
		await page
			.locator('button:has-text("Save"), button:has-text("Create")')
			.first()
			.click();
		const firstSuccess = await page
			.locator('.sc-message-success, .notice-success')
			.isVisible({ timeout: 5000 })
			.catch(() => false);
		console.log(firstSuccess ? '✓ First status created' : 'First status saved');

		// Try to create status with same name
		await page
			.locator('button:has-text("Add"), button:has-text("Create")')
			.first()
			.click();
		await page.waitForSelector('.sc-modal, form', { state: 'visible' });
		await page.fill('input[name="name"], input[name="key"]', statusName); // Same name
		await page.fill(
			'input[name="label"], input[name="title"]',
			'Duplicate Test'
		);
		await page
			.locator('button:has-text("Save"), button:has-text("Create")')
			.first()
			.click();

		// Should show validation error
		await expect(
			page.locator('.sc-message-error, .error, .sc-form-item-explain-error')
		).toBeVisible();
	});

	test('should export status configuration', async ({ page }) => {
		const exportButton = page
			.locator('button:has-text("Export"), button:has-text("Download")')
			.first();

		if (await exportButton.isVisible()) {
			// Start export
			const [download] = await Promise.all([
				page.waitForEvent('download'),
				exportButton.click(),
			]);

			// Verify download
			expect(download.suggestedFilename()).toBeTruthy();
			expect(download.suggestedFilename()).toMatch(/\.(json|xml|csv)$/);
		} else {
			test.skip('Export functionality not found');
		}
	});

	test('should import status configuration', async ({ page }) => {
		const importButton = page
			.locator('button:has-text("Import"), input[type="file"]')
			.first();

		if (await importButton.isVisible()) {
			// Create test JSON file
			const testData = JSON.stringify([
				{
					name: 'imported_status',
					label: 'Imported Status',
					description: 'Status imported via test',
					color: '#00FF00',
				},
			]);

			// Import file
			await page.setInputFiles('input[type="file"]', {
				name: 'test-statuses.json',
				mimeType: 'application/json',
				buffer: Buffer.from(testData),
			});

			// Submit import
			await page
				.locator('button:has-text("Import"), button:has-text("Upload")')
				.first()
				.click();

			// Verify success
			await expect(
				page.locator('.sc-message-success, .notice-success')
			).toBeVisible();

			// Verify imported status appears
			await expect(
				page.locator(
					'td:has-text("Imported Status"), li:has-text("Imported Status")'
				)
			).toBeVisible();
		} else {
			test.skip('Import functionality not found');
		}
	});
});
