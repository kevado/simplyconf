const { expect } = require('@playwright/test');

/**
 * Form interaction utilities for WP Abstracts
 */

/**
 * Fill an Ant Design DatePicker field
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - CSS selector for the input field
 * @param {string|null} date - Date string (optional), defaults to today
 */
async function fillDatePicker(page, selector, date = null) {
	// Find the picker input
	const picker = page.locator(selector);
	await expect(picker).toBeVisible();

	// Click to open the dropdown
	await picker.click();

	// Wait for the dropdown to appear
	// Ant Design attaches the dropdown to the body, so we look for it globally
	const dropdown = page.locator('.sc-picker-dropdown:visible');
	await expect(dropdown).toBeVisible();

	if (date) {
		// If a specific date is provided, type it in
		// This is often more reliable than clicking through the calendar
		await picker.fill(date);
		await picker.press('Enter');
	} else {
		// Default: Click "Today" button if available, or just the "Today" cell
		// Try the "Today" footer button first as it's most reliable
		const todayBtn = dropdown.locator('.sc-picker-today-btn');
		if (await todayBtn.isVisible()) {
			await todayBtn.click();
		} else {
			// Fallback to clicking the cell for today
			await dropdown.locator('.sc-picker-cell-today').click();
		}
	}

	// Wait for the dropdown to disappear to ensure selection is complete
	await expect(dropdown).toBeHidden();
}

/**
 * Fill a standard form with provided data
 * @param {import('@playwright/test').Page} page
 * @param {Object} formData - Key-value pairs of field selectors and values
 */
async function fillForm(page, formData) {
	for (const [selector, value] of Object.entries(formData)) {
		const field = page.locator(selector);
		await expect(field).toBeVisible();
		await field.fill(value);
	}
}

/**
 * Submit a form and wait for success
 * @param {import('@playwright/test').Page} page
 * @param {string} formId - ID of the form to submit
 * @param {string} modalSelector - Optional selector for the modal containing the form
 */
async function submitForm(page, formId, modalSelector = null) {
	const submitBtn = page.locator(`button[form="${formId}"]`);
	await submitBtn.click();

	if (modalSelector) {
		// If in a modal, wait for the modal to close
		await expect(page.locator(modalSelector)).toBeHidden();
	}
}

module.exports = {
	fillDatePicker,
	fillForm,
	submitForm,
};
