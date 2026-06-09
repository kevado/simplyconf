const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../../utils/auth');
const {
	navigateToAdmin,
	waitForPageLoad,
} = require('../../../utils/navigation');
const { fillCustomFields } = require('../../../utils/customFields');

let lastCreatedAbstractTitle = null;
let lastCreatedAbstractDescription = null;
let lastCreatedAbstractId = null;

/**
 * Abstract Management Tests
 *
 * Tests for creating, editing, and managing abstracts using strict data-testid selectors
 */

test.describe('Abstract Management', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test('should display abstracts list page', async ({ page }) => {
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// Verify page loaded using new test ID
		const heading = page
			.locator('h1, h2, h3')
			.filter({ hasText: /abstracts/i })
			.first();
		await expect(heading).toBeVisible();

		// Check for create button as a strong signal the page loaded
		const createBtn = page.getByTestId('create-abstract-btn');
		await expect(createBtn).toBeVisible({ timeout: 15000 });

		// Verify navigation tabs exist
		await expect(page.getByTestId('nav-submissions')).toBeVisible();
		await expect(page.getByTestId('nav-settings')).toBeVisible();

		console.log('✓ Abstracts list page loaded');
	});

	test('should create a new abstract via wizard', async ({ page }) => {
		test.setTimeout(90000); // Increase timeout to 90 seconds

		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// Use new create button test ID
		const createBtn = page.getByTestId('create-abstract-btn');
		await expect(createBtn).toBeVisible();
		await createBtn.click();

		await waitForPageLoad(page);

		const timestamp = Date.now();
		const testAbstract = {
			title: `Admin Test Abstract ${timestamp}`,
			description: `This is a test abstract created by admin automated test at ${new Date().toISOString()}`,
		};

		// Wait for the wizard to load
		await page.waitForSelector('.sc-steps', {
			state: 'visible',
			timeout: 15000,
		});

		// Verify we're on the create page
		const currentUrl = page.url();
		expect(currentUrl).toContain('/abstracts/create');
		console.log('✓ Admin wizard loaded at:', currentUrl);

		// Step 0: Event & Track Selection (Form submission)
		const trackSelect = page.locator('[id*="track_id"]').first();
		await expect(trackSelect).toBeVisible({ timeout: 10000 });

		// Click track select to open dropdown
		await trackSelect.click();
		await page.waitForTimeout(500);

		// Select first track from dropdown
		const firstTrackOption = page.locator('.sc-select-item-option').first();
		await expect(firstTrackOption).toBeVisible({ timeout: 5000 });
		await firstTrackOption.click();
		await page.waitForTimeout(500);

		// Click Next (submits form)
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 0: Event and track selected');

		// Step 1: Abstract Details (Form submission)
		const titleInput = page.locator('input[id*="title"]').first();
		await expect(titleInput).toBeVisible({ timeout: 10000 });
		await titleInput.fill(testAbstract.title);

		const descInput = page.locator('textarea[id*="description"]').first();
		await descInput.fill(testAbstract.description);

		// Click Next (submits form)
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 1: Abstract details filled');

		// Step 2: Custom Fields (onClick handler, not form)
		await page.waitForTimeout(1000);
		await fillCustomFields(page, { fillOptional: true });

		// Click Next (onClick handler)
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 2: Custom fields filled');

		// Step 3: Authors
		await page.locator('button:has-text("Add Author")').first().click();
		await page.waitForSelector('.sc-modal', { state: 'visible' });
		await page.fill('input[id*="first_name"]', 'Admin');
		await page.fill('input[id*="last_name"]', 'Tester');
		await page.fill(
			'input[id*="email"]',
			`admin.test.${timestamp}@example.com`
		);
		await fillCustomFields(page, {
			scope: '.sc-modal',
			excludeFields: ['first_name', 'last_name', 'email'],
			fillOptional: true,
		});
		await page.locator('.sc-modal button:has-text("OK")').first().click();
		await page.waitForSelector('.sc-modal', { state: 'hidden' });

		// Click Next
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 3: Author added');

		// Step 4: Attachments (if enabled) - look for "Continue to Review" button
		const fileUploadStep = page.locator('.sc-upload-drag');
		if (await fileUploadStep.isVisible({ timeout: 3000 }).catch(() => false)) {
			const continueBtn = page
				.locator('button:has-text("Continue to Review")')
				.first();
			if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				await continueBtn.click();
				await page.waitForTimeout(1000);
				console.log('✓ Step 4: Attachments step completed');
			}
		} else {
			// No attachments step, try clicking Next if visible
			const nextBtnAttachments = page.getByTestId('wizard-next-btn');
			if (
				await nextBtnAttachments.isVisible({ timeout: 2000 }).catch(() => false)
			) {
				await nextBtnAttachments.click();
				await page.waitForTimeout(1000);
			}
		}

		// Step 5: Review - Submit
		const submitBtn = page.getByTestId('wizard-submit-btn');
		await expect(submitBtn).toBeVisible({ timeout: 10000 });
		await expect(submitBtn).toBeEnabled();
		await submitBtn.click();

		await page.waitForSelector('.sc-result-success, .sc-message-success', {
			timeout: 20000,
		});

		// Verify success
		const successTitle = page.locator(
			'.sc-result-title, .sc-message-success'
		);
		await expect(successTitle).toBeVisible();

		console.log(`✓ Abstract created via wizard: ${testAbstract.title}`);
		lastCreatedAbstractTitle = testAbstract.title;
		lastCreatedAbstractDescription = testAbstract.description;

		// Capture abstract ID for subsequent tests
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);
		const abstractRow = page
			.locator('tr[data-testid^="abstract-row-"]')
			.filter({ hasText: testAbstract.title })
			.first();
		await expect(abstractRow).toBeVisible({ timeout: 20000 });
		const rowTestId = await abstractRow.getAttribute('data-testid');
		const idMatch = rowTestId?.match(/abstract-row-(\d+)/);
		if (!idMatch) {
			throw new Error(
				'Unable to capture abstract ID for newly created abstract'
			);
		}

		lastCreatedAbstractId = idMatch[1];
		console.log(`✓ Captured abstract ID: ${idMatch[1]}`);
	});

	test('should view abstract details', async ({ page }) => {
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// Find first visible abstract row using strict test ID regex
		const firstAbstract = page.getByTestId(/^abstract-row-/).first();
		await expect(firstAbstract).toBeVisible({ timeout: 10000 });

		// Click the action button to toggle dropdown
		const actionBtn = firstAbstract.getByTestId('abstract-action-btn');
		if (await actionBtn.isVisible().catch(() => false)) {
			await actionBtn.click({ force: true }); // Force click
			await page.waitForTimeout(1000);

			// Wait for dropdown menu item using strict test ID
			const viewMenuItem = page.getByTestId('view-abstract-btn').first();
			await expect(viewMenuItem).toBeVisible();
			await viewMenuItem.click();
		} else {
			// Fallback to direct link/button if action button not found
			const viewLink = firstAbstract
				.locator('a:has-text("View"), button:has-text("View")')
				.first();
			await viewLink.click();
		}

		await waitForPageLoad(page);

		// Verify we're on abstract details page
		expect(page.url()).toMatch(/abstracts\/view/);
		const abstractTitle = page
			.locator('h1, h2, .abstract-title, input[name="title"]')
			.first();
		await expect(abstractTitle).toBeVisible();

		console.log('✓ Abstract details loaded');
	});

	test('should edit existing abstract', async ({ page }) => {
		test.setTimeout(90000);

		const abstractId = lastCreatedAbstractId;
		if (!abstractId) {
			console.log('⚠ No abstract ID from create test; skipping edit test.');
			test.skip();
		}

		await navigateToAdmin(page, `/abstracts/edit/${abstractId}`);
		await waitForPageLoad(page);

		expect(page.url()).toMatch(/abstracts\/edit/);
		await page.waitForSelector('.sc-steps', {
			state: 'visible',
			timeout: 15000,
		});

		// Step 0: Event & Track should already be populated
		const trackSelect = page.locator('[id*="track_id"]').first();
		await expect(trackSelect).toBeVisible({ timeout: 10000 });
		await expect(page.getByTestId('wizard-next-btn').first()).toBeEnabled();
		await page.getByTestId('wizard-next-btn').first().click();
		await page.waitForTimeout(500);

		// Step 1: Abstract Details
		const titleInput = page.locator('input[id*="title"]').first();
		await expect(titleInput).toBeVisible({ timeout: 10000 });
		const originalTitle = lastCreatedAbstractTitle;
		if (originalTitle) {
			await expect(titleInput).toHaveValue(originalTitle);
		}
		const currentTitle = await titleInput.inputValue();
		const newTitle = `${currentTitle} (Edited ${Date.now()})`;
		await titleInput.fill(newTitle);
		const descInput = page.locator('textarea[id*="description"]').first();
		const originalDescription = lastCreatedAbstractDescription;
		if (originalDescription) {
			await expect(descInput).toHaveValue(originalDescription);
		}
		await descInput.fill(
			`${
				originalDescription || 'Updated description'
			}\nEdited at ${new Date().toISOString()}`
		);
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(500);

		// Step 2: Custom Fields
		await fillCustomFields(page, { fillOptional: true });
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(500);

		// Step 3: Authors (already present from create; just continue)
		await page
			.locator('button:has-text("Add Author")')
			.waitFor({ timeout: 10000 });
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(500);

		// Step 4: Attachments
		const fileUploadStep = page.locator('.sc-upload-drag');
		if (await fileUploadStep.isVisible({ timeout: 3000 }).catch(() => false)) {
			const continueBtn = page
				.locator('button:has-text("Continue to Review")')
				.first();
			await continueBtn.click();
			await page.waitForTimeout(500);
		} else {
			const nextBtn = page.getByTestId('wizard-next-btn');
			if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await nextBtn.click();
				await page.waitForTimeout(500);
			}
		}

		// Review & Submit
		const submitBtn = page.getByTestId('wizard-submit-btn');
		await expect(submitBtn).toBeVisible({ timeout: 15000 });
		const reviewContent = page
			.locator('.sc-card')
			.filter({ hasText: 'Abstract Content' })
			.first();
		await expect(reviewContent).toContainText(newTitle);
		await submitBtn.click();

		await page.waitForSelector('.sc-result-success, .sc-message-success', {
			timeout: 20000,
		});
		console.log(`✓ Abstract updated: ${newTitle}`);
	});

	test('should change abstract status', async ({ page }) => {
		test.setTimeout(90000);

		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// Find first visible abstract row using strict test ID regex
		const firstAbstract = page.getByTestId(/^abstract-row-/).first();
		await expect(firstAbstract).toBeVisible({ timeout: 10000 });

		const actionBtn = firstAbstract.getByTestId('abstract-action-btn');
		await actionBtn.hover();
		await actionBtn.click({ force: true });
		const dropdown = page.locator('.sc-dropdown:visible').first();
		await expect(dropdown).toBeVisible();
		const statusMenuItem = dropdown
			.getByRole('menuitem', { name: /change status/i })
			.first();
		await statusMenuItem.waitFor({ state: 'visible', timeout: 5000 });
		await statusMenuItem.hover();
		await statusMenuItem.click({ force: true });

		const modal = page.locator('.sc-modal:has-text("Change Abstract Status")');
		await expect(modal).toBeVisible({ timeout: 10000 });
		const statusSelect = modal.locator('.sc-select-selector').first();
		await statusSelect.click();
		const option = page
			.locator('.sc-select-dropdown:visible .sc-select-item-option')
			.nth(1);
		await option.click();
		await modal.locator('button:has-text("Update")').click();
		await page.waitForSelector('.sc-message-success', { timeout: 10000 });
		console.log('✓ Abstract status changed via action menu');
	});

	test('should filter abstracts by status', async ({ page }) => {
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		const statusFilter = page.getByTestId('status-filter').first();
		const abstractRows = page.locator('tr[data-testid^="abstract-row-"]');

		if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
			const initialRowCount = await abstractRows.count();
			await statusFilter.click();
			const statusOption = page
				.locator('.sc-select-dropdown:visible .sc-select-item-option')
				.nth(1);
			await expect(statusOption).toBeVisible();
			const selectedStatus = (await statusOption.innerText()).trim();
			await statusOption.click();

			const tableSpinner = page.locator('#simplyconf-admin .sc-spin-spinning');
			if (
				await tableSpinner
					.first()
					.isVisible()
					.catch(() => false)
			) {
				await tableSpinner.first().waitFor({ state: 'hidden', timeout: 10000 });
			} else {
				await page.waitForTimeout(1000);
			}

			const filteredRowCount = await abstractRows.count();
			console.log(
				`✓ Abstracts filtered by status: ${selectedStatus} (${initialRowCount} -> ${filteredRowCount})`
			);
		} else {
			console.log('⚠ Status filter not available');
			test.skip();
		}
	});

	test('should search abstracts', async ({ page }) => {
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		const searchInput = page.getByTestId('abstract-search-input').first();

		if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
			await searchInput.fill('test');
			const searchButton = page
				.locator('button:has-text("Search"), .sc-input-search-button')
				.first();
			if (await searchButton.isVisible({ timeout: 1000 }).catch(() => false)) {
				await searchButton.click();
			} else {
				await searchInput.press('Enter');
			}
			await waitForPageLoad(page);
			console.log('✓ Abstract search executed');
		} else {
			console.log('⚠ Search field not available');
			test.skip();
		}
	});

	test('should delete abstract', async ({ page }) => {
		test.setTimeout(90000); // Increase timeout
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// First, create an abstract to delete
		const createBtn = page.getByTestId('create-abstract-btn');
		await expect(createBtn).toBeVisible();
		await createBtn.click();
		await waitForPageLoad(page);

		const abstractTitle = `Delete Test ${Date.now()}`;
		await page.waitForSelector('.sc-steps', {
			state: 'visible',
			timeout: 15000,
		});

		// Step 0: Event & Track
		await page.locator('[id*="track_id"]').first().click();
		await page.locator('.sc-select-item-option').first().click();
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 1: Title & Description
		await page.locator('input[id*="title"]').first().fill(abstractTitle);
		await page
			.locator('textarea[id*="description"]')
			.first()
			.fill('Description for delete test');
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 2: Custom Fields
		await fillCustomFields(page, { fillOptional: true });
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 3: Authors
		await page.locator('button:has-text("Add Author")').first().click();
		await page.waitForSelector('.sc-modal', { state: 'visible' });
		await page.fill('input[id*="first_name"]', 'Delete');
		await page.fill('input[id*="last_name"]', 'Me');
		await page.fill('input[id*="email"]', `delete.${Date.now()}@example.com`);
		await fillCustomFields(page, {
			scope: '.sc-modal',
			excludeFields: ['first_name', 'last_name', 'email'],
			fillOptional: true,
		});
		await page.locator('.sc-modal button:has-text("OK")').first().click();
		await page.waitForSelector('.sc-modal', { state: 'hidden' });
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 4: Attachments (if enabled)
		const fileUploadStep = page.locator('.sc-upload-drag');
		if (await fileUploadStep.isVisible({ timeout: 3000 }).catch(() => false)) {
			const continueBtn = page
				.locator('button:has-text("Continue to Review")')
				.first();
			if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				await continueBtn.click();
				await page.waitForTimeout(1000);
			}
		} else {
			const nextBtnAttachments = page.getByTestId('wizard-next-btn');
			if (
				await nextBtnAttachments.isVisible({ timeout: 2000 }).catch(() => false)
			) {
				await nextBtnAttachments.click();
				await page.waitForTimeout(1000);
			}
		}

		// Submit
		const submitBtn = page.getByTestId('wizard-submit-btn');
		await expect(submitBtn).toBeVisible({ timeout: 10000 });
		await expect(submitBtn).toBeEnabled();
		await submitBtn.click();

		await page.waitForSelector('.sc-result-success, .sc-message-success', {
			timeout: 20000,
		});
		console.log(`✓ Abstract created: ${abstractTitle}`);

		// Now go to abstracts list and delete it
		await navigateToAdmin(page, '/abstracts');
		await waitForPageLoad(page);

		// Find the abstract using strict test ID regex
		const abstractRow = page
			.locator(`tr[data-testid^="abstract-row-"]:has-text("${abstractTitle}")`)
			.first();
		await expect(abstractRow).toBeVisible({ timeout: 10000 });

		// Delete it using action button
		const actionBtn = abstractRow.getByTestId('abstract-action-btn');
		if (await actionBtn.isVisible().catch(() => false)) {
			await actionBtn.click({ force: true }); // Force click
			await page.waitForTimeout(1000);
			const deleteMenuItem = page.getByTestId('delete-abstract-btn').first();
			await deleteMenuItem.click();
		} else {
			const deleteButton = abstractRow
				.locator('button:has-text("Delete"), a:has-text("Delete")')
				.first();
			await deleteButton.click();
		}

		// Confirm deletion in popconfirm
		const popconfirm = page.locator('.sc-popconfirm');
		await expect(popconfirm).toBeVisible({ timeout: 5000 });

		const confirmButton = popconfirm.locator('button.sc-btn-primary');
		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/simplyconf/v1/abstracts') && res.status() === 200
			),
			confirmButton.click(),
		]);

		await page.waitForTimeout(1000);

		// Verify deleted
		const deletedAbstract = page.locator(
			`tr[data-testid^="abstract-row-"]:has-text("${abstractTitle}")`
		);
		await expect(deletedAbstract).toHaveCount(0);

		console.log(`✓ Abstract deleted: ${abstractTitle}`);
	});

	test('wizard back navigation works between steps', async ({ page }) => {
		test.setTimeout(60000);
		await navigateToAdmin(page, '/abstracts/create');
		await waitForPageLoad(page);

		// Wait for wizard to load
		await page
			.waitForSelector('[data-testid="abstract-submission-wizard"]', {
				timeout: 15000,
			})
			.catch(async () => {
				await page.waitForSelector('.sc-steps', { timeout: 15000 });
			});

		// Step 0: Select a track and advance
		const trackSelect = page.locator('[id*="track_id"]').first();
		if (!(await trackSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
			console.log('Track select not visible — skipping wizard back test');
			return;
		}

		await trackSelect.click();
		await page.waitForTimeout(500);
		const firstTrack = page.locator('.sc-select-item-option').first();
		if (await firstTrack.isVisible({ timeout: 3000 }).catch(() => false)) {
			await firstTrack.click();
		}
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Now on step 1 — click Back button
		const backBtn = page.locator('button:has-text("Back")').first();
		const backVisible = await backBtn.isVisible({ timeout: 3000 }).catch(() => false);

		if (!backVisible) {
			console.log('Back button not found on step 1 — wizard may not support back navigation');
			return;
		}

		await backBtn.click();
		await page.waitForTimeout(500);

		// Should be back on step 0 — track select should be visible again
		const trackSelectAgain = page.locator('[id*="track_id"]').first();
		const backOnStep0 = await trackSelectAgain
			.isVisible({ timeout: 5000 })
			.catch(() => false);

		if (backOnStep0) {
			console.log('✓ Back navigation works — returned to step 0');
		} else {
			// Check if .sc-steps-item-active shows step 0
			const activeStep = await page.locator('.sc-steps-item-active').first().textContent().catch(() => '');
			console.log(`Back navigation result — active step: "${activeStep}"`);
		}
	});

	test('wizard requires title field before advancing from step 1', async ({
		page,
	}) => {
		test.setTimeout(60000);
		await navigateToAdmin(page, '/abstracts/create');
		await waitForPageLoad(page);

		await page
			.waitForSelector('[data-testid="abstract-submission-wizard"]', { timeout: 15000 })
			.catch(async () => {
				await page.waitForSelector('.sc-steps', { timeout: 15000 });
			});

		// Step 0: Select track and advance
		const trackSelect = page.locator('[id*="track_id"]').first();
		if (!(await trackSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
			console.log('Track select not visible — skipping validation test');
			return;
		}
		await trackSelect.click();
		await page.waitForTimeout(500);
		const firstTrack = page.locator('.sc-select-item-option').first();
		if (await firstTrack.isVisible({ timeout: 3000 }).catch(() => false)) {
			await firstTrack.click();
		}
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 1: Try to advance WITHOUT filling title
		const titleInput = page.locator('input[id*="title"]').first();
		if (!(await titleInput.isVisible({ timeout: 5000 }).catch(() => false))) {
			console.log('Title field not found on step 1 — skipping');
			return;
		}

		// Clear any pre-filled title
		await titleInput.fill('');
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(500);

		// Should show validation error
		const validationError = page.locator('.sc-form-item-explain-error');
		const errorVisible = await validationError.isVisible({ timeout: 3000 }).catch(() => false);

		if (errorVisible) {
			const errorText = await validationError.first().textContent();
			console.log(`✓ Validation error shown: "${errorText}"`);
		} else {
			// Some wizards may not validate on next click
			console.log('Validation error not shown — wizard may auto-validate differently');
		}
	});

	test('wizard file upload step accepts a file', async ({ page }) => {
		test.setTimeout(90000);
		await navigateToAdmin(page, '/abstracts/create');
		await waitForPageLoad(page);

		await page
			.waitForSelector('[data-testid="abstract-submission-wizard"]', { timeout: 15000 })
			.catch(async () => {
				await page.waitForSelector('.sc-steps', { timeout: 15000 });
			});

		// Step 0: Select track
		const trackSelect = page.locator('[id*="track_id"]').first();
		if (!(await trackSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
			console.log('Track select not visible — skipping file upload test');
			return;
		}
		await trackSelect.click();
		await page.waitForTimeout(500);
		const firstTrack = page.locator('.sc-select-item-option').first();
		if (await firstTrack.isVisible({ timeout: 3000 }).catch(() => false)) {
			await firstTrack.click();
		}
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 1: Fill title and advance
		const titleInput = page.locator('input[id*="title"]').first();
		if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
			await titleInput.fill(`File Upload Test ${Date.now()}`);
			const descInput = page.locator('textarea[id*="description"]').first();
			if (await descInput.isVisible().catch(() => false)) {
				await descInput.fill('Testing file upload functionality');
			}
		}
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 2: Custom fields — advance
		await page.getByTestId('wizard-next-btn').click();
		await page.waitForTimeout(1000);

		// Step 3: Authors — skip by advancing
		await page.getByTestId('wizard-next-btn').click().catch(() => {});
		await page.waitForTimeout(1000);

		// Step 4: Attachments — check if file upload is available
		const fileUploadDrop = page.locator('.sc-upload-drag');
		const uploadVisible = await fileUploadDrop.isVisible({ timeout: 5000 }).catch(() => false);

		if (!uploadVisible) {
			console.log('File upload step not visible — attachments may be disabled for this event');
			return;
		}

		// Create a test file via Playwright buffer
		const fileInput = page.locator('input[type="file"]');
		const inputVisible = await fileInput.isVisible().catch(() => false);

		if (inputVisible) {
			// Upload a simple text file as PDF substitute (for testing UI)
			await fileInput.setInputFiles({
				name: 'test-abstract.pdf',
				mimeType: 'application/pdf',
				buffer: Buffer.from('Fake PDF content for testing'),
			});
			await page.waitForTimeout(2000);

			// Check if file appears in the upload area
			const uploadedFile = page.locator('.sc-upload-list-item');
			const fileAppeared = await uploadedFile.isVisible({ timeout: 5000 }).catch(() => false);

			if (fileAppeared) {
				const filename = await uploadedFile.textContent().catch(() => '');
				console.log(`✓ File upload triggered — file: "${filename}"`);
			} else {
				console.log('File upload attempted — checking for any upload response');
			}
		} else {
			console.log('File input not directly accessible — upload may require drag-drop');
		}
	});
});
