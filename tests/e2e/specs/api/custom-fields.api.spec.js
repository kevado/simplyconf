/**
 * Custom Fields REST API Tests
 *
 * Tests all CRUD operations, auth guards, and validation for:
 *   GET/POST   /wp-json/simplyconf/v1/customfields
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/customfields/:id
 *   DELETE  /wp-json/simplyconf/v1/customfields/bulk-delete
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Custom Fields API', () => {
	let api;
	let fieldId;
	let bulkFieldIds = [];

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (fieldId) {
			await api.delete(`${API}/customfields/${fieldId}`).catch(() => {});
		}
		for (const id of bulkFieldIds) {
			await api.delete(`${API}/customfields/${id}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /customfields returns 200 with array', async () => {
		const resp = await api.get(`${API}/customfields?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /customfields items have label, type, usage fields', async () => {
		const resp = await api.get(`${API}/customfields?event_id=${EVENT_ID}`);
		const fields = await resp.json();
		if (fields.length > 0) {
			const f = fields[0];
			expect(f.label).toBeDefined();
			expect(f.type).toBeDefined();
		}
	});

	test('GET /customfields/public is publicly accessible', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/customfields/public?usage=user&event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		await unauthed.dispose();
	});

	test('GET /customfields requires auth', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/customfields?event_id=${EVENT_ID}`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	test('GET /customfields can filter by usage', async () => {
		const resp = await api.get(
			`${API}/customfields?event_id=${EVENT_ID}&usage=abstract`,
		);
		expect(resp.status()).toBe(200);
		const fields = await resp.json();
		expect(Array.isArray(fields)).toBe(true);
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /customfields creates text field and returns field_id', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/customfields`, {
			data: {
				event_id: EVENT_ID,
				label: `API Text Field ${ts}`,
				name: `api_text_${ts}`,
				type: 'text',
				usage: 'abstract',
				required: 0,
			},
		});
		expect([200, 201]).toContain(resp.status());
		const field = await resp.json();
		expect(field.field_id).toBeDefined();
		expect(field.type).toBe('text');
		fieldId = field.field_id;
		console.log(`Created custom field ID: ${fieldId}`);
	});

	test('POST /customfields creates select field with options', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/customfields`, {
			data: {
				event_id: EVENT_ID,
				label: `API Select Field ${ts}`,
				name: `api_select_${ts}`,
				type: 'select',
				usage: 'abstract',
				options: [
					{ label: 'Option A', value: 'a' },
					{ label: 'Option B', value: 'b' },
				],
			},
		});
		expect([200, 201]).toContain(resp.status());
		const field = await resp.json();
		expect(field.field_id).toBeDefined();
		bulkFieldIds.push(field.field_id);
	});

	test('POST /customfields requires manage_options', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/customfields`, {
			data: {
				event_id: EVENT_ID,
				label: 'Unauthed Field',
				field_type: 'text',
				usage: 'abstract',
			},
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /customfields/:id returns field with expected fields', async () => {
		if (!fieldId) test.skip();
		const resp = await api.get(`${API}/customfields/${fieldId}`);
		expect(resp.status()).toBe(200);
		const field = await resp.json();
		expect(String(field.field_id)).toBe(String(fieldId));
		expect(field.label).toBeDefined();
		expect(field.type).toBe('text');
	});

	test('GET /customfields/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/customfields/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /customfields/:id updates label', async () => {
		if (!fieldId) test.skip();
		const updated = `Updated Field Label ${Date.now()}`;
		const resp = await api.put(`${API}/customfields/${fieldId}`, {
			data: { label: updated },
		});
		expect(resp.status()).toBe(200);
		const field = await resp.json();
		expect(field.label).toBe(updated);
	});

	test('PUT /customfields/:id can mark field as required', async () => {
		if (!fieldId) test.skip();
		const resp = await api.put(`${API}/customfields/${fieldId}`, {
			data: { required: 1 },
		});
		expect(resp.status()).toBe(200);
		const field = await resp.json();
		expect(field.required).toBeTruthy();
	});

	// ─── BULK DELETE ───────────────────────────────────────────────────────────

	test('DELETE /customfields/bulk-delete removes multiple fields', async () => {
		if (bulkFieldIds.length === 0) test.skip();
		const qs = bulkFieldIds.map((id) => `field_ids[]=${id}`).join('&');
		const resp = await api.delete(
			`${API}/customfields/bulk-delete?${qs}`,
		);
		expect([200, 204]).toContain(resp.status());
		// Verify they are gone
		for (const id of bulkFieldIds) {
			const check = await api.get(`${API}/customfields/${id}`);
			expect([404, 400]).toContain(check.status());
		}
		bulkFieldIds = [];
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /customfields/:id deletes field', async () => {
		if (!fieldId) test.skip();
		const resp = await api.delete(`${API}/customfields/${fieldId}`);
		expect([200, 204]).toContain(resp.status());

		const check = await api.get(`${API}/customfields/${fieldId}`);
		expect([404, 400]).toContain(check.status());
		fieldId = null;
	});
});
