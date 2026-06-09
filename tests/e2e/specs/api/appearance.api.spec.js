/**
 * Appearance Settings REST API Tests
 *
 * Tests theme customization endpoints for:
 *   GET   /wp-json/simplyconf/v1/appearance-settings
 *   POST  /wp-json/simplyconf/v1/appearance-settings
 *   GET   /wp-json/simplyconf/v1/appearance-settings/presets
 *
 * Note: GET endpoints are public (no auth required).
 *       POST requires manage_options.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Appearance Settings API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── GET SETTINGS ──────────────────────────────────────────────────────────

	test('GET /appearance-settings returns 200 with settings object', async () => {
		const resp = await api.get(`${API}/appearance-settings`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		// Returns either stored settings or defaults — always an object
		expect(typeof data).toBe('object');
		expect(data).not.toBeNull();
	});

	test('GET /appearance-settings unauthenticated returns 200 (public endpoint)', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/appearance-settings`);
		// Appearance settings are public — anyone can read the theme config
		expect(resp.status()).toBe(200);
		await unauthed.dispose();
	});

	// ─── UPDATE SETTINGS ───────────────────────────────────────────────────────

	test('POST /appearance-settings with valid settings returns success', async () => {
		const resp = await api.post(`${API}/appearance-settings`, {
			data: {
				settings: {
					version: '1.0',
					colors: {
						primary: '#1890ff',
						success: '#52c41a',
						warning: '#faad14',
						error: '#ff4d4f',
					},
					preset: 'default',
				},
			},
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
	});

	test('POST /appearance-settings without settings param returns 400', async () => {
		const resp = await api.post(`${API}/appearance-settings`, {
			data: {},
		});
		expect([400, 422]).toContain(resp.status());
	});

	test('POST /appearance-settings unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/appearance-settings`, {
			data: {
				settings: { colors: { primary: '#000000' } },
			},
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── PRESETS ───────────────────────────────────────────────────────────────

	test('GET /appearance-settings/presets returns 200 with presets object', async () => {
		const resp = await api.get(`${API}/appearance-settings/presets`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(typeof data).toBe('object');
		expect(data).not.toBeNull();
		// Should have at least a 'default' preset
		expect(data.default).toBeDefined();
	});

	test('GET /appearance-settings/presets unauthenticated returns 200 (public endpoint)', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/appearance-settings/presets`);
		expect(resp.status()).toBe(200);
		await unauthed.dispose();
	});
});
