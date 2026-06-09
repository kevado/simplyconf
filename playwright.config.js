const baseConfig = require('../playwright.config');

const reporter = baseConfig.reporter?.map((entry) => {
	if (Array.isArray(entry) && entry[0] === 'html') {
		return ['html', { outputFolder: 'tests/e2e/report' }];
	}

	if (Array.isArray(entry) && entry[0] === 'json') {
		return ['json', { outputFile: 'tests/e2e/results.json' }];
	}

	return entry;
});

module.exports = {
	...baseConfig,
	testDir: './tests/e2e',
	testMatch: ['**/*.spec.js'],
	reporter,
};
