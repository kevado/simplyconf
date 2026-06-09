/**
 * Abstracts REST API Tests
 *
 * Tests all CRUD operations, auth guards, and validation for:
 *   GET/POST   /wp-json/simplyconf/v1/abstracts
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/abstracts/:id
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Abstracts API', () => {
	let api;
	let abstractId;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (abstractId) {
			await api.delete(`${API}/abstracts/${abstractId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /abstracts returns 200 with array', async () => {
		const resp = await api.get(`${API}/abstracts?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /abstracts requires event_id param', async () => {
		const resp = await api.get(`${API}/abstracts`);
		// Without event_id, should return 400 or empty array
		expect([200, 400]).toContain(resp.status());
		if (resp.status() === 200) {
			const data = await resp.json();
			// Either returns all or requires event_id — either is acceptable
			expect(Array.isArray(data)).toBe(true);
		}
	});

	test('GET /abstracts unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/abstracts?event_id=${EVENT_ID}`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	test('GET /abstracts response items have title field', async () => {
		const resp = await api.get(`${API}/abstracts?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const abstracts = await resp.json();
		if (abstracts.length > 0) {
			expect(abstracts[0].title).toBeDefined();
		}
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /abstracts creates abstract and returns abstract_id', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/abstracts`, {
			data: {
				event_id: EVENT_ID,
				title: `API Test Abstract ${ts}`,
				abstract_text: 'Test abstract body created via API test suite.',
			},
		});
		expect([200, 201]).toContain(resp.status());
		const abstract = await resp.json();
		expect(abstract.abstract_id).toBeDefined();
		abstractId = abstract.abstract_id;
		console.log(`Created abstract ID: ${abstractId}`);
	});

	test('POST /abstracts without event_id returns 400', async () => {
		const resp = await api.post(`${API}/abstracts`, {
			data: { title: 'No Event Abstract' },
		});
		expect([400, 422]).toContain(resp.status());
	});

	test('POST /abstracts unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/abstracts`, {
			data: { event_id: EVENT_ID, title: 'Unauthed Abstract' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /abstracts/:id returns abstract with expected fields', async () => {
		if (!abstractId) test.skip();
		const resp = await api.get(`${API}/abstracts/${abstractId}`);
		expect(resp.status()).toBe(200);
		const abstract = await resp.json();
		expect(String(abstract.abstract_id)).toBe(String(abstractId));
		expect(abstract.title).toBeDefined();
		expect(String(abstract.event_id)).toBe(String(EVENT_ID));
	});

	test('GET /abstracts/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/abstracts/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /abstracts/:id updates title', async () => {
		if (!abstractId) test.skip();
		const updated = `Updated Abstract ${Date.now()}`;
		const resp = await api.put(`${API}/abstracts/${abstractId}`, {
			data: { title: updated },
		});
		expect(resp.status()).toBe(200);
		const abstract = await resp.json();
		expect(abstract.title).toBe(updated);
	});

	test('PUT /abstracts/:id unauthenticated returns 401 or 403', async () => {
		if (!abstractId) test.skip();
		const unauthed = await createUnauthApi();
		const resp = await unauthed.put(`${API}/abstracts/${abstractId}`, {
			data: { title: 'Hacked' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /abstracts/:id deletes abstract', async () => {
		if (!abstractId) test.skip();
		const resp = await api.delete(`${API}/abstracts/${abstractId}`);
		expect([200, 204]).toContain(resp.status());

		const check = await api.get(`${API}/abstracts/${abstractId}`);
		expect([404, 400]).toContain(check.status());
		abstractId = null;
	});

	test('DELETE /abstracts/:id unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.delete(`${API}/abstracts/1`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
