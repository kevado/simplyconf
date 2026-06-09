const { test, expect } = require('@playwright/test');
const { loginAsUser } = require('../../utils/auth');
const {
	navigateToFrontend,
	waitForPageLoad,
} = require('../../utils/navigation');
const { navigateWizardSteps } = require('../../utils/wizard');
const { fillCustomFields } = require('../../utils/customFields');

test.describe('Abstract Submission Wizard', () => {
	const testUsername = process.env.WP_TEST_AUTHOR_USERNAME || 'demo_user';
	const testPassword = process.env.WP_TEST_AUTHOR_PASSWORD;

	// Generate unique test data
	const timestamp = Date.now();
	const testAbstract = {
		title: `E2E Test Abstract ${timestamp}`,
		description:
			'This is a test abstract created by automated E2E tests to verify the submission wizard workflow.',
		keywords: 'e2e, testing, automation, playwright',
	};

	test('should complete abstract submission wizard', async ({ page }) => {
		test.setTimeout(60000); // Increase timeout to 60 seconds
		// Log in and navigate straight to submissions
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page, '/submissions');
		await waitForPageLoad(page);

		// Open the create wizard via the new CTA
		const newAbstractBtn = page.locator(
			'[data-testid="create-abstract-btn"], button:has-text("New Submission"), a:has-text("New Submission")'
		);
		await expect(newAbstractBtn).toBeVisible({ timeout: 15000 });
		await newAbstractBtn.first().click();

		// Wait for wizard shell
		await page.waitForURL('**/submissions/create', { timeout: 15000 });
		await page.waitForSelector('.sc-steps', {
			state: 'visible',
			timeout: 15000,
		});

		// Verify we're on the create page and not redirecting
		const currentUrl = page.url();
		expect(currentUrl).toContain('/submissions/create');
		console.log('✓ Wizard loaded at:', currentUrl);

		// Step 0: Event & Track Selection
		// Wait for track select to be visible (event is pre-filled and disabled)
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

		// Click Next to move to Step 1
		await expect(
			page.locator('[data-testid="wizard-next-btn"]').first()
		).toBeVisible({
			timeout: 10000,
		});
		await page.locator('[data-testid="wizard-next-btn"]').first().click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 0: Event and track selected');

		// Step 1: Abstract Details (Title & Description)
		// Ant Design forms use input[id] generated from Form.Item name
		const titleInput = page.locator('input[id*="title"]').first();
		await expect(titleInput).toBeVisible({ timeout: 10000 });
		await titleInput.fill(testAbstract.title);

		const descInput = page.locator('textarea[id*="description"]').first();
		await descInput.fill(testAbstract.description);

		await page.locator('[data-testid="wizard-next-btn"]').first().click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 1: Abstract details filled');

		// Step 2: Additional Details (custom fields) or Authors
		// Custom fields vary by event, so we detect and handle them dynamically
		await page.waitForTimeout(1000);

		// Check if we're on Additional Details step by looking for specific indicators
		// If "Add Author" button exists, we're already on Authors step (no custom fields)
		// If only "Next" button exists, we're on Additional Details step
		const addAuthorVisible = await page
			.locator('button:has-text("Add Author")')
			.isVisible({ timeout: 2000 })
			.catch(() => false);

		if (!addAuthorVisible) {
			// We're on Additional Details step - handle custom fields dynamically
			console.log(
				'Additional Details step detected - handling custom fields...'
			);

			// Use the custom fields utility to fill all required fields
			// Note: fillOptional=true fills all custom fields regardless of required status
			// This is needed because the Additional Details custom fields may not be marked as required in the DB
			await fillCustomFields(page, {
				scope: '',
				excludeFields: [],
				fillOptional: true,
			});

			// Wait a moment for fields to update
			await page.waitForTimeout(500);

			// Check if there are any validation errors after filling
			const validationErrors = await page
				.locator('.sc-form-item-explain-error')
				.allTextContents();
			if (validationErrors.length > 0) {
				console.error(
					'Validation errors after filling custom fields:',
					validationErrors
				);
				throw new Error(
					`Form validation errors on Additional Details step: ${validationErrors.join(
						', '
					)}`
				);
			}

			console.log('✓ Step 2: Additional details completed');

			// Click Next to proceed
			await page.locator('[data-testid="wizard-next-btn"]').first().click();
			await page.waitForTimeout(1000);
			console.log('✓ Step 2: Additional details completed');

			// Now wait for Authors step
			await page.waitForSelector('button:has-text("Add Author")', {
				state: 'visible',
				timeout: 10000,
			});
		} else {
			console.log(
				'No Additional Details step - proceeding directly to Authors'
			);
		}

		// Click "Add Author" button to open author form
		const addAuthorBtn = page.locator('button:has-text("Add Author")').first();
		await addAuthorBtn.click();
		await page.waitForTimeout(500);

		// Wait for modal to appear
		await page.waitForSelector('.sc-modal', {
			state: 'visible',
			timeout: 5000,
		});

		// Fill required author fields (first_name, last_name, email are always required)
		await page.fill('input[id*="first_name"]', 'Test');
		await page.fill('input[id*="last_name"]', 'Author');
		await page.fill(
			'input[id*="email"]',
			`test.author.${timestamp}@example.com`
		);

		// Fill any additional required author custom fields using utility
		await fillCustomFields(page, {
			scope: '.sc-modal',
			excludeFields: ['first_name', 'last_name', 'email'],
			fillOptional: true, // Temporarily fill all fields to debug
		});

		// Give a moment for any field validation to complete
		await page.waitForTimeout(500);

		// Verify no validation errors in modal before submitting
		const modalValidationErrors = await page
			.locator('.sc-modal .sc-form-item-explain-error')
			.allTextContents();
		if (modalValidationErrors.length > 0) {
			throw new Error(
				`Form validation errors in author modal: ${modalValidationErrors.join(
					', '
				)}`
			);
		}

		// Click OK button in modal to save author
		const modalOkBtn = page.locator('.sc-modal button:has-text("OK")').first();
		await modalOkBtn.click();

		// Wait for modal to close (increase timeout and check for validation errors)
		try {
			await page.waitForSelector('.sc-modal', {
				state: 'hidden',
				timeout: 10000,
			});
		} catch (error) {
			// If modal didn't close, check for validation errors
			const errorMessages = await page
				.locator('.sc-modal .sc-form-item-explain-error')
				.allTextContents();
			if (errorMessages.length > 0) {
				console.error('Form validation errors:', errorMessages);
			}
			throw new Error(
				`Modal did not close. Validation errors: ${errorMessages.join(', ')}`
			);
		}
		await page.waitForTimeout(500);

		await page.locator('[data-testid="wizard-next-btn"]').first().click();
		await page.waitForTimeout(1000);
		console.log('✓ Step 2: Author added');

		// Step 3: Presentation Type (if exists)
		const presentationTypeField = page.locator(
			'input[name="presentation_type"], .sc-radio-group'
		);
		if (
			await presentationTypeField
				.isVisible({ timeout: 3000 })
				.catch(() => false)
		) {
			// Try to select first radio option
			const firstRadio = page.locator('.sc-radio-wrapper').first();
			await firstRadio.click();

			const nextBtn3 = page.locator('button:has-text("Next")').first();
			await nextBtn3.click();
			await page.waitForTimeout(1000);
			console.log('✓ Step 3: Presentation type selected');
		}

		// Step 4: File Upload (skip for now)
		const fileUploadStep = page.locator('.sc-upload-drag');
		if (await fileUploadStep.isVisible({ timeout: 5000 }).catch(() => false)) {
			const fileInput = fileUploadStep.locator('input[type="file"]').first();
			if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
				await fileInput.setInputFiles('tests/fixtures/sample.pdf');
				await page
					.waitForSelector('.sc-message-success', { timeout: 5000 })
					.catch(() => {});
			}

			const continueBtn = page
				.locator('button:has-text("Continue to Review")')
				.first();
			await expect(continueBtn).toBeVisible({ timeout: 10000 });
			await continueBtn.click();
			await page.waitForTimeout(1000);
			console.log('✓ Step 4: Attachments handled');
		}

		// Final Step: Review & Submit
		const submitBtn = page.locator('[data-testid="wizard-submit-btn"]').first();
		await expect(submitBtn).toBeVisible({ timeout: 15000 });
		await submitBtn.click();

		// Wait for success message
		await page.waitForSelector('.sc-result-success, .sc-message-success', {
			state: 'visible',
			timeout: 10000,
		});

		// Verify success
		const successTitle = page.locator(
			'.sc-result-title, .sc-message-success'
		);
		await expect(successTitle).toBeVisible();
		const successMessage = await successTitle.textContent();
		expect(successMessage.toLowerCase()).toMatch(/success|submitted/i);

		console.log(`✓ Abstract submitted successfully: ${testAbstract.title}`);
	});
});
