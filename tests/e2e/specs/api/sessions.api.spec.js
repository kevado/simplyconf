/**
 * Sessions REST API Tests
 *
 * Tests CRUD operations, auth guards, and sub-resources for:
 *   GET/POST   /wp-json/simplyconf/v1/sessions
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/sessions/:id
 *   POST  /wp-json/simplyconf/v1/sessions/:id/abstracts
 *   GET   /wp-json/simplyconf/v1/sessions/conflicts
 *
 * Note: Primary key is `session_id`. Auth: manage_options required.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
	EVENT_ID,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Sessions API', () => {
	let api;
	let sessionId;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (sessionId) {
			await api.delete(`${API}/sessions/${sessionId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /sessions returns 200 with array', async () => {
		const resp = await api.get(`${API}/sessions?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /sessions items have session_id field', async () => {
		const resp = await api.get(`${API}/sessions?event_id=${EVENT_ID}`);
		const sessions = await resp.json();
		if (sessions.length > 0) {
			expect(sessions[0].session_id).toBeDefined();
		}
	});

	test('GET /sessions unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(
			`${API}/sessions?event_id=${EVENT_ID}`,
		);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /sessions creates session and returns session_id', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/sessions`, {
			data: {
				event_id: EVENT_ID,
				name: `API Test Session ${ts}`,
				start_time: '2025-09-01 09:00:00',
				end_time: '2025-09-01 10:00:00',
				location: 'Room A',
			},
		});
		expect([200, 201]).toContain(resp.status());
		const session = await resp.json();
		expect(session.session_id).toBeDefined();
		expect(session.name).toContain('API Test Session');
		sessionId = session.session_id;
		console.log(`Created session ID: ${sessionId}`);
	});

	test('POST /sessions unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/sessions`, {
			data: { event_id: EVENT_ID, name: 'Should fail' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /sessions/:id returns session with expected fields', async () => {
		if (!sessionId) test.skip();
		const resp = await api.get(`${API}/sessions/${sessionId}`);
		expect(resp.status()).toBe(200);
		const session = await resp.json();
		expect(String(session.session_id)).toBe(String(sessionId));
		expect(session.name).toBeDefined();
	});

	test('GET /sessions/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/sessions/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /sessions/:id updates name', async () => {
		if (!sessionId) test.skip();
		const updated = `Updated Session ${Date.now()}`;
		const resp = await api.put(`${API}/sessions/${sessionId}`, {
			data: { name: updated },
		});
		expect(resp.status()).toBe(200);
		const session = await resp.json();
		expect(session.name).toBe(updated);
	});

	// ─── ASSIGN ABSTRACTS ──────────────────────────────────────────────────────

	test('POST /sessions/:id/abstracts assigns abstract_ids and returns success', async () => {
		if (!sessionId) test.skip();
		const resp = await api.post(
			`${API}/sessions/${sessionId}/abstracts`,
			{
				data: { abstract_ids: [] },
			},
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
		expect(data.assigned).toBeDefined();
	});

	// ─── CONFLICTS ─────────────────────────────────────────────────────────────

	test('GET /sessions/conflicts returns array', async () => {
		const resp = await api.get(
			`${API}/sessions/conflicts?event_id=${EVENT_ID}&start_time=2025-09-01 09:00:00&end_time=2025-09-01 10:00:00`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /sessions/:id deletes session', async () => {
		if (!sessionId) test.skip();
		const resp = await api.delete(`${API}/sessions/${sessionId}`);
		expect([200, 204]).toContain(resp.status());

		const check = await api.get(`${API}/sessions/${sessionId}`);
		expect([404, 400]).toContain(check.status());
		sessionId = null;
	});
});
