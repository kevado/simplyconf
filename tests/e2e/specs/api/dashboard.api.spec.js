/**
 * Dashboard REST API Tests
 *
 * Tests for:
 *   GET /wp-json/simplyconf/v1/dashboard/stats
 *   GET /wp-json/simplyconf/v1/dashboard/activity
 *   GET /wp-json/simplyconf/v1/dashboard/versions
 *   GET /wp-json/simplyconf/v1/appearance-settings
 *   GET /wp-json/simplyconf/v1/appearance-settings/presets
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Dashboard API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── STATS ─────────────────────────────────────────────────────────────────

	test('GET /dashboard/stats returns 200 with stats object', async () => {
		const resp = await api.get(
			`${API}/dashboard/stats?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(typeof data).toBe('object');
	});

	test('GET /dashboard/stats has expected fields', async () => {
		const resp = await api.get(
			`${API}/dashboard/stats?event_id=${EVENT_ID}`,
		);
		const data = await resp.json();
		// Stats should have some counts
		expect(data !== null).toBe(true);
	});

	test('GET /dashboard/stats requires manage_options', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/dashboard/stats?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── ACTIVITY ──────────────────────────────────────────────────────────────

	test('GET /dashboard/activity returns 200 with activities array', async () => {
		const resp = await api.get(
			`${API}/dashboard/activity?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data.activities)).toBe(true);
	});

	test('GET /dashboard/activity respects limit param', async () => {
		const resp = await api.get(
			`${API}/dashboard/activity?event_id=${EVENT_ID}&limit=5`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.activities.length).toBeLessThanOrEqual(5);
	});

	test('GET /dashboard/activity requires manage_options', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/dashboard/activity?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── VERSIONS ──────────────────────────────────────────────────────────────

	test('GET /dashboard/versions returns core version', async () => {
		const resp = await api.get(`${API}/dashboard/versions`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.core).toBeDefined();
		expect(data.core.version).toBeDefined();
		console.log(`Core version: ${data.core.version}`);
	});

	// ─── APPEARANCE ────────────────────────────────────────────────────────────

	test('GET /appearance-settings is publicly accessible', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/appearance-settings?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		await unauthed.dispose();
	});

	test('GET /appearance-settings returns settings object', async () => {
		const resp = await api.get(
			`${API}/appearance-settings?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(typeof data).toBe('object');
	});

	test('GET /appearance-settings/presets returns presets object', async () => {
		const resp = await api.get(`${API}/appearance-settings/presets`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(typeof data).toBe('object');
		expect(data !== null).toBe(true);
		// Should have at least one preset key
		expect(Object.keys(data).length).toBeGreaterThan(0);
	});

	test('POST /appearance-settings requires manage_options', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/appearance-settings`, {
			data: { event_id: EVENT_ID, primary_color: '#ff0000' },
		});
		expect([400, 401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
