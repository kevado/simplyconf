/**
 * Frontend REST API Tests
 *
 * Tests frontend user dashboard endpoints (profile, submissions, schedule) for:
 *   GET/PUT  /wp-json/simplyconf/v1/frontend/profile
 *   GET      /wp-json/simplyconf/v1/frontend/submissions
 *   GET      /wp-json/simplyconf/v1/frontend/dashboard/my-stats
 *   GET      /wp-json/simplyconf/v1/frontend/schedule  (schedules addon)
 *
 * Note: Auth: any logged-in user (authors, reviewers, track chairs, admins).
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
	EVENT_ID,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Frontend API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── PROFILE ───────────────────────────────────────────────────────────────

	test('GET /frontend/profile returns 200 with user data', async () => {
		const resp = await api.get(
			`${API}/frontend/profile?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data !== null).toBe(true);
	});

	test('GET /frontend/profile unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/frontend/profile?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── SUBMISSIONS ────────────────────────────────────────────────────────────

	test('GET /frontend/submissions returns 200 with array', async () => {
		const resp = await api.get(
			`${API}/frontend/submissions?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /frontend/submissions unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/frontend/submissions?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── MY STATS ──────────────────────────────────────────────────────────────

	test('GET /frontend/dashboard/my-stats returns 200', async () => {
		const resp = await api.get(
			`${API}/frontend/dashboard/my-stats?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
	});

	test('GET /frontend/dashboard/my-stats unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/frontend/dashboard/my-stats?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── SCHEDULE ──────────────────────────────────────────────────────────────

	test('GET /frontend/schedule returns 200 or 404', async () => {
		const resp = await api.get(
			`${API}/frontend/schedule?event_id=${EVENT_ID}`,
		);
		// May return 404 if schedules addon not active
		expect([200, 404]).toContain(resp.status());
	});
});
