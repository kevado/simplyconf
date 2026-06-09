const { expect } = require('@playwright/test');

/**
 * Utility functions for handling dynamic custom fields in E2E tests
 * Uses data-testid attributes added to CustomFieldRenderer.js for reliable selection
 */

/**
 * Fill all required custom fields in a form using data-testid selectors
 * This is a simplified, reliable approach that uses the data-testid attributes
 * added to all custom field inputs in CustomFieldRenderer.js
 *
 * @param {Page} page - Playwright page object
 * @param {Object} options - Configuration options
 * @param {string} options.scope - CSS selector to scope the search (e.g., '.sc-modal' for modal fields)
 * @param {Array<string>} options.excludeFields - Array of field names to skip (e.g., ['First Name', 'Email'])
 * @param {Object} options.fieldValues - Optional map of field labels to specific values
 * @param {boolean} options.fillOptional - Whether to also fill non-required fields (default: false)
 */
async function fillCustomFields(page, options = {}) {
	const {
		scope = '',
		excludeFields = [],
		fieldValues = {},
		fillOptional = false,
	} = options;

	// Build scope selector
	const scopeSelector = scope ? `${scope} ` : '';

	// Find all custom field inputs with data-testid
	const customFieldPattern = `${scopeSelector}[data-testid^="custom-field-"]`;
	const allCustomFields = page.locator(customFieldPattern);
	const count = await allCustomFields.count();

	console.log(`Found ${count} custom fields in scope '${scope || 'page'}'`);

	for (let i = 0; i < count; i++) {
		const field = allCustomFields.nth(i);
		const testId = await field.getAttribute('data-testid');
		const fieldName = testId.replace('custom-field-', '');

		// Skip excluded fields
		if (excludeFields.some((ex) => fieldName.includes(ex))) {
			console.log(`  Skipping excluded field: ${fieldName}`);
			continue;
		}

		// Check if field is in a required form item (unless fillOptional is true)
		if (!fillOptional) {
			// Check if the field's closest form item has the required class
			const formItem = field
				.locator('xpath=ancestor::div[contains(@class, "ant-form-item")]')
				.first();
			const formItemClass = await formItem
				.getAttribute('class')
				.catch(() => '');
			const isRequired = formItemClass.includes('ant-form-item-required');

			if (!isRequired) {
				continue;
			}
		}

		try {
			// Determine field type and fill accordingly
			const tagName = await field.evaluate((el) => el.tagName.toLowerCase());
			const className = (await field.getAttribute('class')) || '';

			// Handle text inputs, email, number
			if (tagName === 'input') {
				const type = (await field.getAttribute('type')) || 'text';

				if (type === 'email') {
					const value =
						fieldValues[fieldName] || `test${Date.now()}@example.com`;
					await field.fill(value);
					console.log(`  ✓ Filled email: ${fieldName}`);
				} else if (type === 'number') {
					const value = fieldValues[fieldName] || '5';
					await field.fill(value);
					console.log(`  ✓ Filled number: ${fieldName}`);
				} else {
					const value = fieldValues[fieldName] || `Test ${fieldName}`;
					await field.fill(value);
					console.log(`  ✓ Filled text: ${fieldName}`);
				}
			}
			// Handle textarea
			else if (tagName === 'textarea') {
				const value = fieldValues[fieldName] || `Test ${fieldName} content`;
				await field.fill(value);
				console.log(`  ✓ Filled textarea: ${fieldName}`);
			}
			// Handle select dropdown (Ant Design Select)
			else if (className.includes('ant-select')) {
				// Check if select already has a value
				const hasValue =
					(await field.locator('.sc-select-selection-item').count()) > 0;
				if (hasValue) {
					console.log(`  ⊙ Select already has value: ${fieldName}`);
				} else {
					// Click to open dropdown
					await field.click();
					await page.waitForTimeout(500);

					// Try to click first visible option with better error handling
					try {
						const firstOption = page.locator('.sc-select-item-option').first();
						await firstOption.click({ timeout: 2000 });
						await page.waitForTimeout(200);
						console.log(`  ✓ Selected option: ${fieldName}`);
					} catch (error) {
						// If click fails, try pressing Enter to select highlighted option
						await page.keyboard.press('Enter');
						await page.waitForTimeout(200);
						console.log(`  ✓ Selected option (via Enter): ${fieldName}`);
					}
				}
			}
			// Handle radio group
			else if (className.includes('ant-radio-group')) {
				const firstRadio = field.locator('.sc-radio-wrapper').first();
				await firstRadio.click();
				await page.waitForTimeout(200);
				console.log(`  ✓ Selected radio: ${fieldName}`);
			}
			// Handle checkbox group
			else if (className.includes('ant-checkbox-group')) {
				const firstCheckbox = field.locator('.sc-checkbox-wrapper').first();
				await firstCheckbox.click();
				await page.waitForTimeout(200);
				console.log(`  ✓ Checked checkbox group: ${fieldName}`);
			}
			// Handle single checkbox
			else if (className.includes('ant-checkbox')) {
				await field.click();
				await page.waitForTimeout(200);
				console.log(`  ✓ Checked checkbox: ${fieldName}`);
			}
			// Handle rating
			else if (className.includes('ant-rate')) {
				const stars = field.locator('.sc-rate-star');
				const starCount = await stars.count();
				if (starCount > 0) {
					await stars.nth(Math.floor(starCount / 2)).click();
					await page.waitForTimeout(200);
					console.log(`  ✓ Rated: ${fieldName}`);
				}
			}
			// Handle Date Picker
			else if (className.includes('ant-picker')) {
				await field.click();
				// Wait for dropdown
				const dropdown = page.locator('.sc-picker-dropdown:visible');
				await expect(dropdown).toBeVisible();

				// Try to click "Today" button
				const todayBtn = dropdown.locator('.sc-picker-today-btn');
				if (await todayBtn.isVisible()) {
					await todayBtn.click();
				} else {
					// Fallback to clicking the cell for today
					await dropdown.locator('.sc-picker-cell-today').click();
				}

				await expect(dropdown).toBeHidden();
				console.log(`  ✓ Picked date: ${fieldName}`);
			}
		} catch (error) {
			console.log(`  ✗ Error filling ${fieldName}: ${error.message}`);
		}
	}
}

/**
 * Check if a form has any required custom fields
 * @param {Page} page - Playwright page object
 * @param {string} scope - CSS selector to scope the search
 * @returns {Promise<boolean>} - True if required fields exist
 */
async function hasRequiredFields(page, scope = '') {
	const scopeSelector = scope ? `${scope} ` : '';
	const requiredItems = page.locator(`${scopeSelector}.sc-form-item-required`);
	const count = await requiredItems.count();
	return count > 0;
}

/**
 * Get count of unfilled required fields
 * @param {Page} page - Playwright page object
 * @param {string} scope - CSS selector to scope the search
 * @returns {Promise<number>} - Count of unfilled required fields
 */
async function getUnfilledRequiredFieldsCount(page, scope = '') {
	const scopeSelector = scope ? `${scope} ` : '';

	let unfilledCount = 0;

	// Check text inputs
	const textInputs = page.locator(
		`${scopeSelector}.sc-form-item-required input[type="text"]`
	);
	const textCount = await textInputs.count();
	for (let i = 0; i < textCount; i++) {
		const value = await textInputs
			.nth(i)
			.inputValue()
			.catch(() => '');
		if (!value) unfilledCount++;
	}

	// Check textareas
	const textareas = page.locator(
		`${scopeSelector}.sc-form-item-required textarea`
	);
	const textareaCount = await textareas.count();
	for (let i = 0; i < textareaCount; i++) {
		const value = await textareas
			.nth(i)
			.inputValue()
			.catch(() => '');
		if (!value) unfilledCount++;
	}

	// Check selects (look for placeholder text indicating no selection)
	const selects = page.locator(
		`${scopeSelector}.sc-form-item-required .sc-select .sc-select-selection-placeholder`
	);
	unfilledCount += await selects.count();

	return unfilledCount;
}

module.exports = {
	fillCustomFields,
	hasRequiredFields,
	getUnfilledRequiredFieldsCount,
};
