/**
 * Tracks REST API Tests
 *
 * Tests all CRUD operations, auth guards, and validation for:
 *   GET/POST   /wp-json/simplyconf/v1/tracks
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/tracks/:id
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Tracks API', () => {
	let api;
	let trackId;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (trackId) {
			await api.delete(`${API}/tracks/${trackId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /tracks returns 200 with array', async () => {
		const resp = await api.get(`${API}/tracks?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /tracks response items have name field', async () => {
		const resp = await api.get(`${API}/tracks?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const tracks = await resp.json();
		if (tracks.length > 0) {
			expect(tracks[0].name).toBeDefined();
		}
	});

	test('GET /tracks unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/tracks?event_id=${EVENT_ID}`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /tracks creates track and returns track_id', async () => {
		const ts = Date.now();
		const resp = await api.post(`${API}/tracks`, {
			data: {
				event_id: EVENT_ID,
				name: `API Track ${ts}`,
				description: 'Track created by API test',
			},
		});
		expect([200, 201]).toContain(resp.status());
		const track = await resp.json();
		expect(track.track_id).toBeDefined();
		expect(track.name).toContain('API Track');
		trackId = track.track_id;
		console.log(`Created track ID: ${trackId}`);
	});

	test('POST /tracks unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/tracks`, {
			data: { event_id: EVENT_ID, name: 'Unauthed Track' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /tracks/:id returns track with expected fields', async () => {
		if (!trackId) test.skip();
		const resp = await api.get(`${API}/tracks/${trackId}`);
		expect(resp.status()).toBe(200);
		const track = await resp.json();
		expect(String(track.track_id)).toBe(String(trackId));
		expect(track.name).toBeDefined();
		expect(String(track.event_id)).toBe(String(EVENT_ID));
	});

	test('GET /tracks/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/tracks/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /tracks/:id updates name', async () => {
		if (!trackId) test.skip();
		const updated = `Updated Track ${Date.now()}`;
		const resp = await api.put(`${API}/tracks/${trackId}`, {
			data: { name: updated },
		});
		expect(resp.status()).toBe(200);
		const track = await resp.json();
		expect(track.name).toBe(updated);
	});

	test('PUT /tracks/:id unauthenticated returns 401 or 403', async () => {
		if (!trackId) test.skip();
		const unauthed = await createUnauthApi();
		const resp = await unauthed.put(`${API}/tracks/${trackId}`, {
			data: { name: 'Hacked' },
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /tracks/:id deletes track', async () => {
		if (!trackId) test.skip();
		const resp = await api.delete(`${API}/tracks/${trackId}`);
		expect([200, 204]).toContain(resp.status());

		const check = await api.get(`${API}/tracks/${trackId}`);
		expect([404, 400]).toContain(check.status());
		trackId = null;
	});
});
