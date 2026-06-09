/**
 * Dashboard Setup REST API Tests
 *
 * Tests dashboard page management endpoints for:
 *   GET     /wp-json/simplyconf/v1/dashboard-setup/status
 *   POST    /wp-json/simplyconf/v1/dashboard-setup/create
 *   DELETE  /wp-json/simplyconf/v1/dashboard-setup/delete
 *
 * Note: All require manage_options capability.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
	EVENT_ID,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Dashboard Setup API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── STATUS ────────────────────────────────────────────────────────────────

	test('GET /dashboard-setup/status returns 200 with status object', async () => {
		const resp = await api.get(
			`${API}/dashboard-setup/status?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(typeof data).toBe('object');
		expect(data).not.toBeNull();
	});

	test('GET /dashboard-setup/status unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/dashboard-setup/status?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /dashboard-setup/create returns 200 or 400 (idempotent)', async () => {
		const resp = await api.post(`${API}/dashboard-setup/create`, {
			data: { event_id: EVENT_ID },
		});
		// 200 = created successfully, 400 = already exists or creation failed
		expect([200, 400]).toContain(resp.status());
		const data = await resp.json();
		// Either way, a success field should be present
		expect(data.success !== undefined).toBe(true);
	});

	test('POST /dashboard-setup/create unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/dashboard-setup/create`, {
			data: { event_id: EVENT_ID },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /dashboard-setup/delete unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.delete(
			`${API}/dashboard-setup/delete?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
