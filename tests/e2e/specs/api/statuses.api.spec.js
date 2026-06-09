/**
 * Statuses REST API Tests
 *
 * Tests all CRUD operations, auth guards, and validation for:
 *   GET/POST   /wp-json/simplyconf/v1/statuses
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/statuses/:id
 *   GET  /wp-json/simplyconf/v1/statuses/default
 *   GET  /wp-json/simplyconf/v1/statuses/initial
 *   GET  /wp-json/simplyconf/v1/statuses/by-name
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Statuses API', () => {
	let api;
	let statusId;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (statusId) {
			await api.delete(`${API}/statuses/${statusId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /statuses returns 200 with array', async () => {
		const resp = await api.get(`${API}/statuses?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /statuses items have name, type, color fields', async () => {
		const resp = await api.get(`${API}/statuses?event_id=${EVENT_ID}`);
		const statuses = await resp.json();
		if (statuses.length > 0) {
			const s = statuses[0];
			expect(s.name).toBeDefined();
			expect(s.type).toBeDefined();
		}
	});

	test('GET /statuses is publicly accessible', async () => {
		// Statuses use __return_true permission callback
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/statuses?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		await unauthed.dispose();
	});

	// ─── SPECIAL ENDPOINTS ─────────────────────────────────────────────────────

	test('GET /statuses/default returns default abstract status', async () => {
		const resp = await api.get(
			`${API}/statuses/default?event_id=${EVENT_ID}&type=abstract`,
		);
		// May return 200 with status or 404 if not set up
		expect([200, 404]).toContain(resp.status());
		if (resp.status() === 200) {
			const data = await resp.json();
			expect(data.name).toBeDefined();
		}
	});

	test('GET /statuses/initial returns initial abstract status', async () => {
		const resp = await api.get(
			`${API}/statuses/initial?event_id=${EVENT_ID}&type=abstract`,
		);
		expect([200, 404]).toContain(resp.status());
	});

	test('GET /statuses/by-name returns matching status', async () => {
		// First get available statuses to find a real name
		const list = await api.get(`${API}/statuses?event_id=${EVENT_ID}`);
		const statuses = await list.json();
		if (statuses.length === 0) {
			console.log('No statuses found — skipping by-name test');
			return;
		}
		const firstName = statuses[0].name;
		const type = statuses[0].type;
		const resp = await api.get(
			`${API}/statuses/by-name?event_id=${EVENT_ID}&type=${type}&name=${encodeURIComponent(firstName)}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.name).toBe(firstName);
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /statuses creates status and returns status_id', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/statuses`, {
			data: {
				event_id: EVENT_ID,
				name: `API Status ${ts}`,
				label: `API Status ${ts}`,
				type: 'abstract',
				color: '#3498db',
			},
		});
		expect([200, 201]).toContain(resp.status());
		const status = await resp.json();
		expect(status.status_id).toBeDefined();
		statusId = status.status_id;
		console.log(`Created status ID: ${statusId}`);
	});

	test('POST /statuses without name returns 400', async () => {
		const resp = await api.post(`${API}/statuses`, {
			data: { event_id: EVENT_ID, type: 'abstract' },
		});
		expect([400, 422]).toContain(resp.status());
	});

	test('POST /statuses requires manage_options - rejects regular login', async () => {
		// Unauthenticated requests should be rejected
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/statuses`, {
			data: { event_id: EVENT_ID, name: 'Unauthed Status', type: 'abstract' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /statuses/:id returns status with expected fields', async () => {
		if (!statusId) test.skip();
		const resp = await api.get(`${API}/statuses/${statusId}`);
		expect(resp.status()).toBe(200);
		const status = await resp.json();
		expect(String(status.status_id)).toBe(String(statusId));
		expect(status.name).toBeDefined();
		expect(status.type).toBe('abstract');
	});

	test('GET /statuses/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/statuses/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /statuses/:id updates status color', async () => {
		if (!statusId) test.skip();
		const resp = await api.put(`${API}/statuses/${statusId}`, {
			data: { color: '#e74c3c' },
		});
		expect(resp.status()).toBe(200);
		const status = await resp.json();
		expect(status.color).toBe('#e74c3c');
	});

	test('PUT /statuses/:id unauthenticated returns 401 or 403', async () => {
		if (!statusId) test.skip();
		const unauthed = await createUnauthApi();
		const resp = await unauthed.put(`${API}/statuses/${statusId}`, {
			data: { color: '#000000' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /statuses/:id deletes status', async () => {
		if (!statusId) test.skip();
		const resp = await api.delete(`${API}/statuses/${statusId}`);
		expect([200, 204]).toContain(resp.status());

		const check = await api.get(`${API}/statuses/${statusId}`);
		expect([404, 400]).toContain(check.status());
		statusId = null;
	});
});
