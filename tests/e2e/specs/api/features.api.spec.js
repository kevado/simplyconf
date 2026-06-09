/**
 * Features REST API Tests
 *
 * Tests feature flag endpoints for:
 *   GET   /wp-json/simplyconf/v1/features/list
 *   GET   /wp-json/simplyconf/v1/features/enabled
 *   POST  /wp-json/simplyconf/v1/features/check
 *   POST  /wp-json/simplyconf/v1/features/grant    (admin only)
 *   POST  /wp-json/simplyconf/v1/features/revoke   (admin only)
 *
 * Note: GET/POST check require `read` capability. Grant/revoke require manage_options.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Features API', () => {
	let api;
	let knownFeature;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /features/list returns 200 with features object', async () => {
		const resp = await api.get(`${API}/features/list`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.features).toBeDefined();
		expect(data.is_saas !== undefined).toBe(true);

		// Capture a known feature slug for subsequent tests
		const featureSlugs = Object.keys(data.features);
		if (featureSlugs.length > 0) {
			knownFeature = featureSlugs[0];
			console.log(`Known feature slug: ${knownFeature}`);
		}
	});

	test('GET /features/list unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/features/list`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── ENABLED ───────────────────────────────────────────────────────────────

	test('GET /features/enabled returns 200 with features array', async () => {
		const resp = await api.get(`${API}/features/enabled`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
		expect(data.features).toBeDefined();
	});

	test('GET /features/enabled unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/features/enabled`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── CHECK ─────────────────────────────────────────────────────────────────

	test('POST /features/check with valid feature returns has_access', async () => {
		if (!knownFeature) test.skip();
		const resp = await api.post(`${API}/features/check`, {
			data: { feature: knownFeature },
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.has_access !== undefined).toBe(true);
		expect(data.feature).toBe(knownFeature);
	});

	test('POST /features/check with invalid feature returns 400', async () => {
		const resp = await api.post(`${API}/features/check`, {
			data: { feature: 'definitely_not_a_valid_feature_slug_xyz' },
		});
		expect([400, 422]).toContain(resp.status());
	});

	// ─── GRANT / REVOKE (admin only) ───────────────────────────────────────────

	test('POST /features/grant unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/features/grant`, {
			data: { feature: 'reviews' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	test('POST /features/revoke unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/features/revoke`, {
			data: { feature: 'reviews' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
