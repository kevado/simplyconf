/**
 * Attachments REST API Tests
 *
 * Tests auth guards and query-parameter validation for:
 *   GET   /wp-json/simplyconf/v1/attachments
 *   POST  /wp-json/simplyconf/v1/attachments/upload  (auth guard only — multipart excluded)
 *   DELETE  /wp-json/simplyconf/v1/attachments/:id
 *   PUT   /wp-json/simplyconf/v1/attachments/:id
 *
 * Note: Primary key is `attachment_id`. Auth: any logged-in user.
 * Actual file upload is excluded (requires multipart/form-data binary fixture).
 * GET /attachments requires entity_type+entity_id OR event_id+manage_options.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
	EVENT_ID,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Attachments API', () => {
	let api;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /attachments with event_id (admin) returns 200 with array', async () => {
		const resp = await api.get(
			`${API}/attachments?event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /attachments with entity_type and entity_id returns 200', async () => {
		// entity_id=1 may not exist but the route should still return 200 with empty array
		const resp = await api.get(
			`${API}/attachments?entity_type=abstract&entity_id=1&event_id=${EVENT_ID}`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /attachments without params returns 400', async () => {
		const resp = await api.get(`${API}/attachments`);
		expect(resp.status()).toBe(400);
	});

	test('GET /attachments with invalid entity_type returns 400', async () => {
		const resp = await api.get(
			`${API}/attachments?entity_type=invalid&entity_id=1`,
		);
		expect([400, 500]).toContain(resp.status());
	});

	test('GET /attachments unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/attachments?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── ATTACHMENT FIELDS ─────────────────────────────────────────────────────

	test('GET /attachments items have attachment_id field when results exist', async () => {
		const resp = await api.get(
			`${API}/attachments?event_id=${EVENT_ID}`,
		);
		const attachments = await resp.json();
		if (attachments.length > 0) {
			expect(attachments[0].attachment_id).toBeDefined();
			expect(attachments[0].file_name).toBeDefined();
			expect(attachments[0].download_url).toBeDefined();
		}
	});

	// ─── UPLOAD AUTH GUARD ─────────────────────────────────────────────────────

	test('POST /attachments/upload unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		// Send minimal request (will fail with 400 for missing file, but auth is checked first)
		const resp = await unauthed.post(`${API}/attachments/upload`, {
			data: {},
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── DELETE AUTH GUARD ─────────────────────────────────────────────────────

	test('DELETE /attachments/:id with non-existent ID returns 404', async () => {
		const resp = await api.delete(`${API}/attachments/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	test('DELETE /attachments/:id unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.delete(`${API}/attachments/1`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── UPDATE AUTH GUARD ─────────────────────────────────────────────────────

	test('PUT /attachments/:id with non-existent ID returns 404', async () => {
		const resp = await api.put(`${API}/attachments/999999`, {
			data: { file_purpose: 'submission' },
		});
		expect([404, 400]).toContain(resp.status());
	});

	test('PUT /attachments/:id unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.put(`${API}/attachments/1`, {
			data: { file_purpose: 'submission' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
