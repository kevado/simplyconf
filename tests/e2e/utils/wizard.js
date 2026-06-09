async function navigateWizardSteps(page, stepsData) {
	for (const step of stepsData) {
		await page.waitForSelector(step.selector, { state: 'visible' });

		if (step.fields) {
			for (const [field, value] of Object.entries(step.fields)) {
				await page.fill(field, value);
			}
		}

		if (step.fileUploads) {
			for (const upload of step.fileUploads) {
				const fileInput = page.locator(upload.selector);
				await fileInput.setInputFiles(upload.filePath);
				await page.waitForSelector('.sc-upload-list-item-name');
			}
		}

		const nextButton = page
			.locator('button:has-text("Next"), button:has-text("Continue")')
			.first();
		await nextButton.click();
		await page.waitForTimeout(1000);
	}
}

module.exports = { navigateWizardSteps };
