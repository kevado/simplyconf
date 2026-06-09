/**
 * Licenses REST API Tests
 *
 * Tests license management endpoints for:
 *   GET   /wp-json/simplyconf/v1/licenses/all
 *   GET   /wp-json/simplyconf/v1/licenses/status?addon=reviews
 *   POST  /wp-json/simplyconf/v1/licenses/activate
 *   POST  /wp-json/simplyconf/v1/licenses/deactivate
 *   POST  /wp-json/simplyconf/v1/licenses/validate
 *
 * Note: All require manage_options AND non-SaaS mode.
 * In SaaS mode all endpoints return 403.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';
const VALID_ADDONS = ['reviews', 'emails', 'schedules', 'payments', 'exports'];

test.describe('Licenses API', () => {
	let api;
	let isSaaS = false;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));

		// Determine if we're in SaaS mode (affects all endpoints)
		const resp = await api.get(`${API}/features/list`);
		if (resp.status() === 200) {
			const data = await resp.json();
			isSaaS = data.is_saas === true;
			if (isSaaS) {
				console.log('SaaS mode detected — license endpoints return 403');
			}
		}
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── ALL LICENSES ──────────────────────────────────────────────────────────

	test('GET /licenses/all returns 200 with licenses object (non-SaaS)', async () => {
		const resp = await api.get(`${API}/licenses/all`);
		// In SaaS mode, permission_callback returns false → 403
		if (isSaaS) {
			expect([401, 403]).toContain(resp.status());
			return;
		}
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
		expect(data.licenses).toBeDefined();
		// Each addon should be listed
		for (const addon of VALID_ADDONS) {
			expect(data.licenses[addon]).toBeDefined();
		}
	});

	test('GET /licenses/all unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/licenses/all`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── STATUS ────────────────────────────────────────────────────────────────

	test('GET /licenses/status with valid addon returns 200', async () => {
		const resp = await api.get(`${API}/licenses/status?addon=reviews`);
		if (isSaaS) {
			expect([401, 403]).toContain(resp.status());
			return;
		}
		expect(resp.status()).toBe(200);
	});

	test('GET /licenses/status with invalid addon returns 400', async () => {
		const resp = await api.get(`${API}/licenses/status?addon=invalid_addon`);
		if (isSaaS) {
			expect([401, 403, 400]).toContain(resp.status());
			return;
		}
		expect([400, 422]).toContain(resp.status());
	});

	// ─── ACTIVATE AUTH GUARD ───────────────────────────────────────────────────

	test('POST /licenses/activate unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/licenses/activate`, {
			data: { addon: 'reviews', license_key: 'test-key' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	test('POST /licenses/activate with invalid addon returns 400', async () => {
		const resp = await api.post(`${API}/licenses/activate`, {
			data: { addon: 'invalid_addon', license_key: 'test-key' },
		});
		if (isSaaS) {
			expect([401, 403]).toContain(resp.status());
			return;
		}
		expect([400, 422]).toContain(resp.status());
	});

	// ─── VALIDATE AUTH GUARD ───────────────────────────────────────────────────

	test('POST /licenses/validate unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/licenses/validate`, {
			data: { addon: 'reviews' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
