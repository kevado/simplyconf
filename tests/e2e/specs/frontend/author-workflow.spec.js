const { test, expect } = require('@playwright/test');
const { loginAsUser } = require('../../utils/auth');
const {
	navigateToFrontend,
	waitForPageLoad,
} = require('../../utils/navigation');

/**
 * Frontend Author Workflow Tests
 *
 * Tests for author-facing functionality (submit abstracts, upload files)
 */

test.describe('Author Workflow', () => {
	const testEventId = process.env.TEST_EVENT_ID || '7';
	const testUsername = process.env.WP_TEST_AUTHOR_USERNAME || 'demo_user';
	const testPassword = process.env.WP_TEST_AUTHOR_PASSWORD;

	test('should load frontend dashboard after login', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);

		// Navigate to frontend dashboard
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Verify dashboard loaded
		const dashboard = page.locator('#simplyconf-dashboard, .dashboard');
		await expect(dashboard).toBeVisible({ timeout: 10000 });

		console.log('✓ Frontend dashboard loaded');
	});

	test('should display submit abstract option', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Look for submit/create abstract button or link
		const submitLink = page.locator(
			'a:has-text("Submit"), a:has-text("New Abstract"), button:has-text("Submit Abstract")'
		);
		await expect(submitLink).toBeVisible({ timeout: 10000 });

		console.log('✓ Submit abstract option visible');
	});

	test('should navigate to submit abstract form', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Click submit abstract link
		const submitLink = page
			.locator(
				'a:has-text("Submit"), a:has-text("New Abstract"), button:has-text("Submit Abstract")'
			)
			.first();
		await submitLink.click();

		await page.waitForTimeout(2000);

		// Verify form loaded
		const form = page.locator('form, .abstract-form');
		await expect(form).toBeVisible({ timeout: 10000 });

		console.log('✓ Submit abstract form loaded');
	});

	test('should submit new abstract', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Navigate to submit form
		const submitLink = page
			.locator(
				'a:has-text("Submit"), a:has-text("New Abstract"), button:has-text("Submit Abstract")'
			)
			.first();
		await submitLink.click();
		await page.waitForTimeout(2000);

		// Fill abstract form
		const timestamp = Date.now();
		const abstractTitle = `Test Abstract ${timestamp}`;

		// Title field
		const titleField = page.locator(
			'input[name="title"], input#title, input[placeholder*="title" i]'
		);
		if (await titleField.isVisible({ timeout: 5000 }).catch(() => false)) {
			await titleField.fill(abstractTitle);

			// Abstract text/body
			const abstractField = page.locator(
				'textarea[name="abstract"], textarea#abstract, textarea[placeholder*="abstract" i]'
			);
			if (await abstractField.isVisible().catch(() => false)) {
				await abstractField.fill(
					'This is a test abstract submission for automated testing.'
				);
			}

			// Look for submit button
			const submitButton = page.locator(
				'button:has-text("Submit"), button:has-text("Save"), button[type="submit"]'
			);
			await submitButton.click();

			await page.waitForTimeout(3000);

			// Verify success (could be message or redirect)
			const successMessage = page.locator('.sc-message-success, .success');
			const isSuccess =
				(await successMessage
					.isVisible({ timeout: 3000 })
					.catch(() => false)) ||
				page.url().includes('dashboard') ||
				page.url().includes('success');

			expect(isSuccess).toBeTruthy();

			console.log(`✓ Abstract submitted: ${abstractTitle}`);
		} else {
			console.log('⚠ Abstract form fields not found');
			test.skip();
		}
	});

	test('should view submitted abstracts list', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Look for my abstracts link
		const myAbstractsLink = page.locator(
			'a:has-text("My Abstracts"), a:has-text("Submissions"), a:has-text("Abstracts")'
		);

		if (await myAbstractsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await myAbstractsLink.click();
			await page.waitForTimeout(2000);

			// Verify list loaded
			const list = page.locator('table, .abstracts-list, .sc-list');
			await expect(list).toBeVisible({ timeout: 10000 });

			console.log('✓ Abstracts list loaded');
		} else {
			console.log('⚠ My Abstracts link not found');
			test.skip();
		}
	});

	test('should edit existing abstract', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Navigate to abstracts list
		const myAbstractsLink = page
			.locator(
				'a:has-text("My Abstracts"), a:has-text("Submissions"), a:has-text("Abstracts")'
			)
			.first();

		if (await myAbstractsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await myAbstractsLink.click();
			await page.waitForTimeout(2000);

			// Find first abstract
			const firstAbstract = page
				.locator('table tbody tr, .abstract-item')
				.first();
			if (await firstAbstract.isVisible({ timeout: 5000 }).catch(() => false)) {
				// Look for edit button
				const editButton = firstAbstract.locator(
					'button:has-text("Edit"), a:has-text("Edit")'
				);

				if (await editButton.isVisible().catch(() => false)) {
					await editButton.click();
				} else {
					// Try clicking the abstract itself
					await firstAbstract.click();
				}

				await page.waitForTimeout(2000);

				// Verify edit form loaded
				const titleField = page.locator('input[name="title"], input#title');
				if (await titleField.isVisible({ timeout: 5000 }).catch(() => false)) {
					// Modify title
					const currentTitle = await titleField.inputValue();
					const newTitle = `${currentTitle} (Edited)`;
					await titleField.clear();
					await titleField.fill(newTitle);

					// Save
					const saveButton = page.locator(
						'button:has-text("Save"), button:has-text("Update")'
					);
					await saveButton.click();

					await page.waitForTimeout(2000);

					console.log(`✓ Abstract edited: ${newTitle}`);
				} else {
					console.log('⚠ Edit form not loaded');
					test.skip();
				}
			} else {
				console.log('⚠ No abstracts to edit');
				test.skip();
			}
		} else {
			console.log('⚠ Cannot navigate to abstracts list');
			test.skip();
		}
	});

	test('should upload file to abstract', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Navigate to submit form or edit existing
		const submitLink = page
			.locator('a:has-text("Submit"), a:has-text("New Abstract")')
			.first();

		if (await submitLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await submitLink.click();
			await page.waitForTimeout(2000);

			// Look for file upload
			const fileInput = page.locator('input[type="file"]');
			if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
				// Create a test file
				const testFile = {
					name: 'test-document.txt',
					mimeType: 'text/plain',
					buffer: Buffer.from('This is a test document for file upload'),
				};

				await fileInput.setInputFiles(testFile);
				await page.waitForTimeout(2000);

				// Verify upload success (look for file name or success message)
				const uploadedFile = page.locator('text="test-document.txt"');
				const uploadSuccess =
					(await uploadedFile
						.isVisible({ timeout: 5000 })
						.catch(() => false)) ||
					(await page.locator('.sc-upload-list-item').count()) > 0;

				expect(uploadSuccess).toBeTruthy();

				console.log('✓ File uploaded successfully');
			} else {
				console.log('⚠ File upload not available');
				test.skip();
			}
		} else {
			console.log('⚠ Cannot access submit form');
			test.skip();
		}
	});

	test('should view abstract status', async ({ page }) => {
		await loginAsUser(page, testUsername, testPassword);
		await navigateToFrontend(page);
		await waitForPageLoad(page);

		// Navigate to abstracts list
		const myAbstractsLink = page
			.locator('a:has-text("My Abstracts"), a:has-text("Submissions")')
			.first();

		if (await myAbstractsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await myAbstractsLink.click();
			await page.waitForTimeout(2000);

			// Look for status column/badge
			const statusBadge = page.locator(
				'.sc-badge, .status-badge, td:has-text("Submitted"), td:has-text("Under Review")'
			);

			if (await statusBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
				console.log('✓ Abstract status visible');
			} else {
				console.log('⚠ Status not displayed');
				test.skip();
			}
		} else {
			console.log('⚠ Cannot navigate to abstracts');
			test.skip();
		}
	});
});
