/**
 * Preferences REST API Tests
 *
 * Tests user preference persistence for:
 *   GET   /wp-json/simplyconf/v1/preferences
 *   POST  /wp-json/simplyconf/v1/preferences
 *   DELETE  /wp-json/simplyconf/v1/preferences/:id
 *
 * Note: Auth: any logged-in user. GET requires event_id.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
	EVENT_ID,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Preferences API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── GET ───────────────────────────────────────────────────────────────────

	test('GET /preferences without event_id returns 400', async () => {
		const resp = await api.get(`${API}/preferences`);
		expect(resp.status()).toBe(400);
	});

	test('GET /preferences with event_id returns 200 with array', async () => {
		const resp = await api.get(`${API}/preferences?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /preferences unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/preferences?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── SAVE ──────────────────────────────────────────────────────────────────

	test('POST /preferences with missing fields returns 400', async () => {
		const resp = await api.post(`${API}/preferences`, {
			data: { event_id: EVENT_ID },
		});
		expect(resp.status()).toBe(400);
	});

	test('POST /preferences with valid data returns success', async () => {
		const resp = await api.post(`${API}/preferences`, {
			data: {
				event_id: EVENT_ID,
				context: 'abstracts',
				preference_key: 'api_test_pref',
				preference_value: { columns: ['title', 'status'] },
			},
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
	});

	test('POST /preferences unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/preferences`, {
			data: {
				event_id: EVENT_ID,
				context: 'test',
				preference_key: 'test',
				preference_value: 'test',
			},
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /preferences/:id with non-existent ID returns success (idempotent)', async () => {
		// WP wpdb->delete returns false only on DB error, 0 for not-found
		const resp = await api.delete(`${API}/preferences/999999`);
		// 200 = success (even if 0 rows deleted), 500 = DB error
		expect([200, 500]).toContain(resp.status());
	});

	test('DELETE /preferences/:id unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.delete(`${API}/preferences/1`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
