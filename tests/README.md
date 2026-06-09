# SimplyConf E2E Testing with Playwright

Automated end-to-end testing for SimplyConf using Playwright.

## Setup

### 1. Install Dependencies

Already installed via npm. If you need to reinstall:

```bash
npm install --save-dev @playwright/test @wordpress/e2e-test-utils-playwright
npx playwright install
```

### 2. Configure Your Local Site

**Step 1**: Copy the environment template:

```bash
cp .env.test.example .env.test
```

**Step 2**: Update `.env.test` with your Local WordPress site details:

- Find your site URL in Local app (e.g., `http://simplyconf.local`)
- Update admin credentials (default is usually `admin`/`admin`)

**Step 3**: Update `playwright.config.js` if needed:

- Change `baseURL` to match your Local site URL

### 3. Prepare Test Data (in WordPress)

Create test users and data in your Local WordPress site:

1. **Admin User**: Already exists (use your existing admin)

2. **Test Author**:

   - Username: `testauthor`
   - Password: `testpass123`
   - Email: `author@test.local`

3. **Test Reviewer**:

   - Username: `testreviewer`
   - Password: `testpass123`
   - Email: `reviewer@test.local`

4. **Test Event**:
   - Create a test event in SimplyConf admin
   - Note the event ID (visible in URL)
   - Update `TEST_EVENT_ID` in `.env.test`

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test smoke.spec.js
```

### Run Tests in Headed Mode (see browser)

```bash
npx playwright test --headed
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests in Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
```

### Run Tests with UI Mode (recommended for development)

```bash
npx playwright test --ui
```

## Test Structure

```
/tests/
  /e2e/
    playwright.config.js      # Playwright configuration
    .env.test                 # Local environment config (gitignored)
    /utils/
      auth.js                 # Login/logout utilities
      navigation.js           # Navigation helpers
      api-helpers.js          # REST API utilities
    /fixtures/
      test-data.json          # Test data fixtures
    /specs/
      smoke.spec.js           # Basic smoke tests
      /core/
        event-management.spec.js
        abstract-management.spec.js
        user-management.spec.js
      /frontend/
        author-workflow.spec.js
        reviewer-workflow.spec.js
      /addons/
        reviews.spec.js
        payments.spec.js
        emails.spec.js
        exports.spec.js
        schedules.spec.js
      /integration/
        full-workflow.spec.js
    /screenshots/             # Test screenshots
    /report/                  # HTML test reports
```

## Writing Tests

### Example Test

```javascript
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('../../utils/auth');
const { navigateToAdmin } = require('../../utils/navigation');

test.describe('Event Management', () => {
	test('should create a new event', async ({ page }) => {
		// Login
		await loginAsAdmin(page);

		// Navigate to events page
		await navigateToAdmin(page, '/events/create');

		// Fill form
		await page.fill('input[name="title"]', 'Test Conference 2025');
		await page.fill('textarea[name="description"]', 'Test description');

		// Submit
		await page.click('button:has-text("Save Event")');

		// Verify success message
		await expect(page.locator('.ant-message-success')).toBeVisible();
		await expect(page.locator('text=Event created successfully')).toBeVisible();
	});
});
```

## Debugging

### View Test Report

```bash
npx playwright show-report tests/e2e/report
```

### Screenshots

Failed tests automatically capture screenshots in `tests/e2e/screenshots/`

### Videos

Failed tests record videos (stored in `test-results/`)

### Traces

View detailed trace files:

```bash
npx playwright show-trace tests/e2e/test-results/[test-name]/trace.zip
```

## CI/CD Integration

Tests are configured to run in GitHub Actions. See `.github/workflows/e2e-tests.yml` (to be created).

## Troubleshooting

### Test Fails with "Page not found"

- Verify Local site is running
- Check `baseURL` in `playwright.config.js` matches your Local URL
- Check `.env.test` has correct URL

### Login Fails

- Verify admin credentials in `.env.test`
- Check WordPress admin username/password in Local

### Tests are Slow

- Tests run serially (one at a time) to avoid database conflicts
- Use `--workers=1` to prevent race conditions
- Use headless mode (default) for faster execution

### Plugin Not Found

- Ensure SimplyConf is activated in Local WordPress
- Check plugin slug in tests matches actual slug

## Next Steps

1. ✅ Run smoke test to verify setup
2. Write event management tests
3. Write abstract management tests
4. Write addon-specific tests
5. Write full integration workflow test
6. Set up CI/CD pipeline

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [WordPress E2E Test Utils](https://github.com/WordPress/gutenberg/tree/trunk/packages/e2e-test-utils-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
