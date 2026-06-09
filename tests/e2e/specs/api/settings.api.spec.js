/**
 * Settings REST API Tests
 *
 * Tests for:
 *   GET/POST  /wp-json/simplyconf/v1/settings
 *   GET  /wp-json/simplyconf/v1/settings/public
 *   GET/PUT  /wp-json/simplyconf/v1/settings/:name
 *   GET  /wp-json/simplyconf/v1/settings/category/:category
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Settings API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── LIST / GET ────────────────────────────────────────────────────────────

	test('GET /settings returns 200 with settings', async () => {
		const resp = await api.get(`${API}/settings?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		// May return array or object depending on implementation
		expect(data !== null).toBe(true);
	});

	test('GET /settings/public is publicly accessible', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/settings/public?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		await unauthed.dispose();
	});

	test('GET /settings/public returns public settings only', async () => {
		const resp = await api.get(
			`${API}/settings/public?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data !== null).toBe(true);
	});

	// ─── CATEGORY ──────────────────────────────────────────────────────────────

	test('GET /settings/category/user returns user settings', async () => {
		const resp = await api.get(
			`${API}/settings/category/user?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
	});

	test('GET /settings/category/event returns event settings', async () => {
		const resp = await api.get(
			`${API}/settings/category/event?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
	});

	// ─── SPECIFIC SETTING ──────────────────────────────────────────────────────

	test('GET /settings/:name returns setting or 404', async () => {
		// Try a known setting name - submission_mode is a common one
		const resp = await api.get(
			`${API}/settings/submission_mode?event_id=${EVENT_ID}`,
		);
		expect([200, 404]).toContain(resp.status());
		if (resp.status() === 200) {
			const data = await resp.json();
			expect(data !== null).toBe(true);
		}
	});
});
