/**
 * Events REST API Tests
 *
 * Tests all CRUD operations, auth guards, and validation for:
 *   GET/POST   /wp-json/simplyconf/v1/events
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/events/:id
 *   PUT  /wp-json/simplyconf/v1/events/:id/status
 *
 * Note: Primary key is `event_id` (not `id`).
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Events API', () => {
	let api;
	let eventId; // event_id of the created event

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (eventId) {
			await api.delete(`${API}/events/${eventId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /events returns 200 with array', async () => {
		const resp = await api.get(`${API}/events`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /events response items have event_id field', async () => {
		const resp = await api.get(`${API}/events`);
		const events = await resp.json();
		if (events.length > 0) {
			expect(events[0].event_id).toBeDefined();
			expect(events[0].name).toBeDefined();
		}
	});

	test('GET /events unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/events`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /events creates event and returns event_id', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/events`, {
			data: {
				name: `API Test Event ${ts}`,
				initials: `AT${ts.toString().slice(-4)}`,
				start_date: '2026-06-01',
				end_date: '2026-06-03',
				deadline: '2026-05-15',
			},
		});
		expect([200, 201]).toContain(resp.status());
		const event = await resp.json();
		expect(event.event_id).toBeDefined();
		expect(event.name).toContain('API Test Event');
		eventId = event.event_id;
		console.log(`Created event event_id: ${eventId}`);
	});

	test('POST /events unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/events`, {
			data: { name: 'Should fail', initials: 'SF' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /events/:id returns event with expected fields', async () => {
		if (!eventId) test.skip();
		const resp = await api.get(`${API}/events/${eventId}`);
		expect(resp.status()).toBe(200);
		const event = await resp.json();
		expect(event.event_id).toBe(String(eventId));
		expect(event.name).toBeDefined();
		expect(event.initials).toBeDefined();
	});

	test('GET /events/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/events/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /events/:id updates name and returns 200', async () => {
		if (!eventId) test.skip();
		const updated = `Updated Event Name ${Date.now()}`;
		const resp = await api.put(`${API}/events/${eventId}`, {
			data: { name: updated },
		});
		expect(resp.status()).toBe(200);
		const event = await resp.json();
		expect(event.name).toBe(updated);
	});

	test('PUT /events/:id/status archives event', async () => {
		if (!eventId) test.skip();
		const resp = await api.put(`${API}/events/${eventId}/status`, {
			data: { status: 'archived' },
		});
		expect([200, 201]).toContain(resp.status());
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /events/:id deletes event', async () => {
		if (!eventId) test.skip();
		const resp = await api.delete(`${API}/events/${eventId}`);
		expect([200, 204]).toContain(resp.status());

		// Verify it's gone
		const check = await api.get(`${API}/events/${eventId}`);
		expect([404, 400]).toContain(check.status());
		eventId = null;
	});

	test('DELETE /events/:id unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.delete(`${API}/events/1`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});
});
