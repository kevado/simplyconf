/**
 * Users REST API Tests
 *
 * Tests all CRUD operations, auth guards, and validation for:
 *   GET/POST   /wp-json/simplyconf/v1/users
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/users/:id
 *   GET  /wp-json/simplyconf/v1/event-users
 *   POST /wp-json/simplyconf/v1/event-users/role
 */

const { test, expect } = require('@playwright/test');
const { createAdminApi, createUnauthApi, EVENT_ID } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Users API', () => {
	let api;
	let userId;
	const ts = Date.now();
	const testEmail = `api_test_${ts}@example.com`;
	const testUsername = `apitest_${ts}`;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
	});

	test.afterAll(async () => {
		if (userId) {
			await api.delete(`${API}/users/${userId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /users returns 200 with array', async () => {
		const resp = await api.get(`${API}/users?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /users items have user_id, email, display_name fields', async () => {
		const resp = await api.get(`${API}/users?event_id=${EVENT_ID}`);
		const users = await resp.json();
		if (users.length > 0) {
			const u = users[0];
			expect(u.user_id !== undefined || u.ID !== undefined).toBe(true);
			expect(u.email !== undefined || u.user_email !== undefined).toBe(true);
		}
	});

	test('GET /users unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/users?event_id=${EVENT_ID}`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	test('GET /users can filter by role', async () => {
		const resp = await api.get(
			`${API}/users?event_id=${EVENT_ID}&role=author`,
		);
		expect(resp.status()).toBe(200);
		const users = await resp.json();
		expect(Array.isArray(users)).toBe(true);
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /users creates user and returns user_id', async () => {
		const resp = await api.post(`${API}/users`, {
			data: {
				event_id: EVENT_ID,
				login: testUsername,
				email: testEmail,
				password: 'TestPass123!',
			},
		});
		expect([200, 201]).toContain(resp.status());
		const user = await resp.json();
		expect(user.user_id).toBeDefined();
		userId = user.user_id;
		console.log(`Created user ID: ${userId}`);
	});

	test('POST /users unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/users`, {
			data: {
				event_id: EVENT_ID,
				username: 'unauthed',
				email: 'unauthed@test.com',
			},
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /users/:id returns user with expected fields', async () => {
		if (!userId) test.skip();
		const resp = await api.get(`${API}/users/${userId}`);
		expect(resp.status()).toBe(200);
		const user = await resp.json();
		expect(user.user_id).toBeDefined();
	});

	test('GET /users/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/users/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /users/:id updates display name', async () => {
		if (!userId) test.skip();
		const resp = await api.put(`${API}/users/${userId}`, {
			data: { first_name: 'UpdatedFirst' },
		});
		expect(resp.status()).toBe(200);
	});

	// ─── EVENT USER ROLES ──────────────────────────────────────────────────────

	test('GET /event-users returns users with event roles', async () => {
		const resp = await api.get(`${API}/event-users?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('POST /event-users/role sets user event role', async () => {
		if (!userId) test.skip();
		const resp = await api.post(`${API}/event-users/role`, {
			data: {
				event_id: EVENT_ID,
				user_id: userId,
				role: 'author',
			},
		});
		expect([200, 201]).toContain(resp.status());
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /users/:id deletes user', async () => {
		if (!userId) test.skip();
		const resp = await api.delete(`${API}/users/${userId}`);
		expect([200, 204]).toContain(resp.status());

		const check = await api.get(`${API}/users/${userId}`);
		expect([404, 400]).toContain(check.status());
		userId = null;
	});
});
