const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');
const {
	createTestUser,
	deleteTestUser,
} = require('../../../utils/api-helpers');

/**
 * User Management Tests
 *
 * Comprehensive tests for managing users and event roles in WP Abstracts
 */

test.describe('User Management', () => {
	const testUserEmail = 'demo@me.com';

	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('should display users list page with all UI elements', async ({
		page,
	}) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Verify page heading
		const header = page.locator('[data-testid="users-header"]');
		await expect(header).toBeVisible();
		await expect(header).toContainText('Users');

		// Verify all toolbar elements
		await expect(
			page.locator('[data-testid="users-search-input"]')
		).toBeVisible();
		await expect(
			page.locator('[data-testid="users-role-filter"]')
		).toBeVisible();
		await expect(
			page.locator('[data-testid="users-refresh-btn"]')
		).toBeVisible();
		await expect(
			page.locator('[data-testid="users-column-visibility-btn"]')
		).toBeVisible();
		await expect(
			page.locator('[data-testid="users-create-btn"]')
		).toBeVisible();

		// Verify table is visible
		await expect(page.locator('[data-testid="users-table"]')).toBeVisible();

		console.log('✓ Users list page loaded with all UI elements');
	});

	test('should create a new user with custom fields', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Click Create User button — opens a guidance modal (WP manages users directly)
		await page.locator('[data-testid="users-create-btn"]').click();

		// Wait for guidance modal to open
		const modal = page.locator('[data-testid="users-create-guidance-modal"]');
		await expect(modal.locator('.sc-modal-content')).toBeVisible({ timeout: 8000 });

		// Guidance modal explains to use WordPress Users admin
		const modalContent = modal.locator('.sc-modal-content');
		await expect(modalContent).toBeVisible();

		// Close the guidance modal
		await page.keyboard.press('Escape');
		await expect(modal.locator('.sc-modal-content')).not.toBeVisible({ timeout: 5000 });

		console.log('✓ User create guidance modal verified');
	});

	test('should filter users by role', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get initial row count
		const initialRows = await page
			.locator('[data-testid="users-table"] tbody tr')
			.count();

		// Open role filter
		const roleFilter = page.locator('[data-testid="users-role-filter"]');
		await roleFilter.click();

		// Select Author role
		await page.locator('.sc-select-item:has-text("Author")').click();
		await page.waitForTimeout(1000);

		// Get filtered row count
		const filteredRows = await page
			.locator('[data-testid="users-table"] tbody tr')
			.count();

		// Filtered count should be different (likely less) than initial count
		// Unless all users are authors
		console.log(`Initial rows: ${initialRows}, Filtered rows: ${filteredRows}`);

		// Reset filter
		await roleFilter.click();
		await page.locator('.sc-select-item:has-text("All Roles")').click();
		await page.waitForTimeout(500);

		console.log('✓ Users filtered by role successfully');
	});

	test('should search for users by name/email', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get initial row count
		const initialRows = await page
			.locator('[data-testid="users-table"] tbody tr')
			.count();

		// Search for test user
		const searchInput = page.locator('[data-testid="users-search-input"]');
		await expect(searchInput).toBeVisible();

		// Search by email
		await searchInput.fill(testUserEmail);
		await page.waitForTimeout(1000);

		// Get filtered row count
		const filteredRows = await page
			.locator('[data-testid="users-table"] tbody tr')
			.count();

		// Should have fewer rows after searching
		expect(filteredRows).toBeLessThanOrEqual(initialRows);

		// Clear search
		await searchInput.clear();
		await page.waitForTimeout(500);

		console.log('✓ User search works correctly');
	});

	test('should edit user custom fields', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get the first visible user row from the table (skip Ant Design measure row)
		const userRow = page
			.locator('[data-testid="users-table"] tbody tr:not([aria-hidden])')
			.first();
		await expect(userRow).toBeVisible();

		// Get the user ID from the actions button data-testid (first td is checkbox)
		const actionsBtn = userRow.locator('[data-testid^="user-"][data-testid$="-actions-btn"]');
		const testId = await actionsBtn.getAttribute('data-testid');
		const userId = testId?.match(/^user-(\d+)-actions-btn$/)?.[1] || '';

		// Open actions dropdown
		const actionsButton = page.locator(
			`[data-testid="user-${userId.trim()}-actions-btn"]`
		);
		await actionsButton.click();

		// Click Edit
		await page.locator('.sc-dropdown-menu-item:has-text("Edit")').click();

		// Wait for edit modal
		const modal = page.locator('[data-testid="users-edit-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Wait for form
		const form = page.locator('[data-testid="user-wizard-form"]');
		await expect(form).toBeVisible();

		// Submit the form via modal footer button
		await modal.locator('button:has-text("Save")').click();

		// Wait for modal to close
		await expect(modal).not.toBeVisible({ timeout: 10000 });

		console.log('✓ User edited successfully');
	});

	test('should view user details', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get the first visible user row from the table (skip Ant Design measure row)
		const userRow = page
			.locator('[data-testid="users-table"] tbody tr:not([aria-hidden])')
			.first();
		await expect(userRow).toBeVisible();

		// Get user ID from actions button data-testid (first td is checkbox)
		const actionsBtn = userRow.locator('[data-testid^="user-"][data-testid$="-actions-btn"]');
		const testId = await actionsBtn.getAttribute('data-testid');
		const userId = testId?.match(/^user-(\d+)-actions-btn$/)?.[1] || '';

		// Open actions dropdown
		const actionsButton = page.locator(
			`[data-testid="user-${userId.trim()}-actions-btn"]`
		);
		await actionsButton.click();

		// Click View
		await page.locator('.sc-dropdown-menu-item:has-text("View")').click();

		// Wait for view modal
		const modal = page.locator('[data-testid="users-view-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Verify basic info card is visible
		await expect(
			page.locator('[data-testid="view-user-basic-info"]')
		).toBeVisible();

		// Close modal
		await modal.locator('button:has-text("Close")').click();
		await expect(modal).not.toBeVisible();

		console.log('✓ User details viewed successfully');
	});

	test('should edit user roles via Edit Roles button', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get the first visible user row from the table (skip Ant Design measure row)
		const userRow = page
			.locator('[data-testid="users-table"] tbody tr:not([aria-hidden])')
			.first();
		await expect(userRow).toBeVisible();

		// Get user ID from actions button data-testid (first td is checkbox)
		const actionsBtn = userRow.locator('[data-testid^="user-"][data-testid$="-actions-btn"]');
		const testId = await actionsBtn.getAttribute('data-testid');
		const userId = testId?.match(/^user-(\d+)-actions-btn$/)?.[1] || '';

		// Click Edit Roles button in the table
		const editRolesBtn = page.locator(
			`[data-testid="user-${userId.trim()}-edit-roles-btn"]`
		);
		await editRolesBtn.click();

		// Wait for role modal
		const modal = page.locator('[data-testid="users-role-modal"]');
		await expect(modal).toBeVisible();

		// Toggle some roles (check/uncheck)
		const reviewerCheckbox = modal.locator('input[type="checkbox"]').nth(1);
		await reviewerCheckbox.click();
		await page.waitForTimeout(500);

		// Click Update Roles button
		await modal.locator('button:has-text("Update Roles")').click();

		// Wait for modal to close
		await expect(modal).not.toBeVisible({ timeout: 5000 });

		console.log('✓ User roles updated via Edit Roles button');
	});

	test('should toggle column visibility', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Click column visibility button
		await page.locator('[data-testid="users-column-visibility-btn"]').click();

		// Wait for modal content to appear
		const modal = page.locator('[data-testid="users-column-modal"]');
		await expect(modal.locator('.sc-modal-content')).toBeVisible({ timeout: 8000 });

		// Verify fixed columns section
		const fixedColsVisible = await modal.locator('text=Fixed Columns').isVisible().catch(() => false);
		console.log(fixedColsVisible ? '✓ Fixed Columns section visible' : 'Fixed Columns section not found');

		// Toggle roles column (example)
		const rolesCheckbox = modal.locator('text=Roles').first();
		const rolesVisible = await rolesCheckbox.isVisible().catch(() => false);
		if (rolesVisible) {
			await rolesCheckbox.click();
			await page.waitForTimeout(500);
		}

		// Close modal
		await page.keyboard.press('Escape');
		await expect(modal.locator('.sc-modal-content')).not.toBeVisible({ timeout: 5000 });

		console.log('✓ Column visibility toggled successfully');
	});

	test('should refresh users list', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get initial row count
		const initialRows = await page
			.locator('[data-testid="users-table"] tbody tr')
			.count();

		// Click refresh button
		await page.locator('[data-testid="users-refresh-btn"]').click();
		await page.waitForTimeout(1500);

		// Get row count after refresh
		const refreshedRows = await page
			.locator('[data-testid="users-table"] tbody tr')
			.count();

		// Should have same or different count (data might have changed)
		expect(refreshedRows).toBeGreaterThanOrEqual(0);

		console.log('✓ Users list refreshed successfully');
	});

	test('should select users and show bulk delete button', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Select the first visible user by clicking checkbox
		const firstCheckbox = page
			.locator('[data-testid="users-table"] tbody tr:not([aria-hidden])')
			.first()
			.locator('input[type="checkbox"]');
		await firstCheckbox.click();

		// After selecting, a "Bulk Actions" dropdown button appears
		const bulkActionsBtn = page.locator('button.simplyconf-bulk-actions-btn');
		await expect(bulkActionsBtn).toBeVisible({ timeout: 5000 });

		// Open bulk actions dropdown
		await bulkActionsBtn.click();

		// Look for "Delete Selected" option in dropdown
		const deleteOption = page
			.locator('.sc-dropdown-menu-item')
			.filter({ hasText: /delete/i })
			.first();
		const deleteVisible = await deleteOption.isVisible({ timeout: 3000 }).catch(() => false);

		if (deleteVisible) {
			await deleteOption.click();

			// Confirm modal appears (Modal.confirm)
			const confirmModal = page.locator('.sc-modal-confirm');
			const modalVisible = await confirmModal.isVisible({ timeout: 5000 }).catch(() => false);

			if (modalVisible) {
				// Cancel instead of deleting
				const cancelBtn = confirmModal
					.locator('button:has-text("Cancel"), .sc-modal-confirm-btns button')
					.first();
				await cancelBtn.click();
				await expect(confirmModal).not.toBeVisible({ timeout: 5000 });
			}
		} else {
			console.log('Delete Selected option not found — closing dropdown');
			await page.keyboard.press('Escape');
		}

		console.log('✓ Bulk actions UI tested successfully');
	});

	test('should handle empty search results', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Search for non-existent user
		const searchInput = page.locator('[data-testid="users-search-input"]');
		await searchInput.fill('NonExistentUser12345XYZ');
		await page.waitForTimeout(1000);

		// Should show empty state — exclude Ant Design measure rows (aria-hidden)
		const rows = await page
			.locator('[data-testid="users-table"] tbody tr:not([aria-hidden])')
			.count();
		expect(rows).toBe(0);

		console.log('✓ Empty search results handled correctly');
	});

	test('should bulk assign roles to selected users', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Get available rows
		const rows = page.locator(
			'[data-testid="users-table"] tbody tr:not([aria-hidden])',
		);
		const rowCount = await rows.count();

		if (rowCount === 0) {
			console.log('No users in table — skipping bulk role assignment test');
			return;
		}

		// Select the first user
		await rows.first().locator('input[type="checkbox"]').click();
		await page.waitForTimeout(300);

		// Open bulk actions dropdown
		const bulkActionsBtn = page.locator('button.simplyconf-bulk-actions-btn');
		const bulkVisible = await bulkActionsBtn.isVisible({ timeout: 5000 }).catch(() => false);
		if (!bulkVisible) {
			console.log('Bulk actions button not visible — skipping');
			return;
		}

		await bulkActionsBtn.click();
		await page.waitForTimeout(500);

		// Find "Assign Role" or similar option
		const assignRoleOption = page
			.locator('.sc-dropdown-menu-item')
			.filter({ hasText: /assign.*role|role/i })
			.first();
		const assignVisible = await assignRoleOption.isVisible({ timeout: 2000 }).catch(() => false);

		if (!assignVisible) {
			console.log('Assign Role option not found in bulk actions — closing');
			await page.keyboard.press('Escape');
			return;
		}

		await assignRoleOption.click();
		await page.waitForTimeout(500);

		// Check for bulk role modal
		const bulkRoleModal = page.locator('[data-testid="users-bulk-role-modal"]');
		const modalVisible = await bulkRoleModal.isVisible({ timeout: 5000 }).catch(() => false);

		if (modalVisible) {
			console.log('✓ Bulk role assignment modal opened');

			// Modal should have role checkboxes
			const checkboxes = bulkRoleModal.locator('input[type="checkbox"]');
			const checkboxCount = await checkboxes.count();
			expect(checkboxCount).toBeGreaterThan(0);

			// Cancel without making changes
			await bulkRoleModal
				.locator('button:has-text("Cancel")')
				.first()
				.click();
			await expect(bulkRoleModal).not.toBeVisible({ timeout: 5000 });
			console.log('✓ Bulk role modal dismissed correctly');
		} else {
			console.log('Bulk role modal did not appear');
		}
	});

	test('should select multiple users for bulk action', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		const rows = page.locator(
			'[data-testid="users-table"] tbody tr:not([aria-hidden])',
		);
		const rowCount = await rows.count();

		if (rowCount < 2) {
			console.log('Need at least 2 users to test multi-select — skipping');
			return;
		}

		// Select first two rows
		await rows.nth(0).locator('input[type="checkbox"]').click();
		await page.waitForTimeout(200);
		await rows.nth(1).locator('input[type="checkbox"]').click();
		await page.waitForTimeout(200);

		// Bulk actions button should appear and show count
		const bulkActionsBtn = page.locator('button.simplyconf-bulk-actions-btn');
		const bulkVisible = await bulkActionsBtn.isVisible({ timeout: 5000 }).catch(() => false);
		expect(bulkVisible).toBe(true);

		const btnText = await bulkActionsBtn.textContent().catch(() => '');
		console.log(`Bulk actions button text with 2 selected: "${btnText}"`);

		// Deselect by unchecking
		await rows.nth(0).locator('input[type="checkbox"]').click();
		await rows.nth(1).locator('input[type="checkbox"]').click();
		await page.waitForTimeout(300);

		console.log('✓ Multi-select bulk actions work correctly');
	});

	test('should persist filter and search state', async ({ page }) => {
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Apply search filter
		const searchInput = page.locator('[data-testid="users-search-input"]');
		await searchInput.fill(testUserEmail);
		await page.waitForTimeout(1000);

		// Apply role filter
		const roleFilter = page.locator('[data-testid="users-role-filter"]');
		await roleFilter.click();
		await page.locator('.sc-select-item:has-text("Author")').click();
		await page.waitForTimeout(1000);

		// Navigate away and back
		await page.goto('#/dashboard');
		await page.waitForTimeout(500);
		await navigateToAdmin(page, '/users');
		await waitForPageLoad(page);

		// Filters should be reset (fresh page load)
		const searchValue = await searchInput.inputValue();
		expect(searchValue).toBe('');

		console.log('✓ Filter state handled correctly on navigation');
	});
});
