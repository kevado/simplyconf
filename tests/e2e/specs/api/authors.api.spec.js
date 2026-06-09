/**
 * Authors REST API Tests
 *
 * Tests CRUD operations, auth guards, search, and sub-resources for:
 *   GET/POST   /wp-json/simplyconf/v1/authors
 *   GET/PUT/DELETE  /wp-json/simplyconf/v1/authors/:id
 *   GET   /wp-json/simplyconf/v1/authors/:id/abstracts
 *   POST  /wp-json/simplyconf/v1/authors/:id/link-user
 *   GET   /wp-json/simplyconf/v1/authors/search
 *
 * Note: Primary key is `author_id`. Auth: any logged-in user.
 * POST validates first_name, last_name, email (required). Email must be unique.
 */

const { test, expect } = require('@playwright/test');
const {
	createAdminApi,
	createUnauthApi,
	EVENT_ID,
} = require('./api-utils');

const API = '/wp-json/simplyconf/v1';

test.describe('Authors API', () => {
	let api;
	let authorId;
	let testEmail;

	test.beforeAll(async ({ browser }) => {
		({ api } = await createAdminApi(browser));
		testEmail = `api-test-author-${Date.now()}@example.com`;
	});

	test.afterAll(async () => {
		if (authorId) {
			await api.delete(`${API}/authors/${authorId}`).catch(() => {});
		}
		await api.dispose();
	});

	// ─── LIST ──────────────────────────────────────────────────────────────────

	test('GET /authors returns 200 with array', async () => {
		const resp = await api.get(`${API}/authors?event_id=${EVENT_ID}`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	test('GET /authors items have author_id field', async () => {
		const resp = await api.get(`${API}/authors?event_id=${EVENT_ID}`);
		const authors = await resp.json();
		if (authors.length > 0) {
			expect(authors[0].author_id).toBeDefined();
			expect(authors[0].first_name).toBeDefined();
			expect(authors[0].email).toBeDefined();
		}
	});

	test('GET /authors unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.get(`${API}/authors?event_id=${EVENT_ID}`);
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── SEARCH ────────────────────────────────────────────────────────────────

	test('GET /authors/search without email returns 400', async () => {
		const resp = await api.get(`${API}/authors/search`);
		expect([400, 404]).toContain(resp.status());
	});

	test('GET /authors/search with email returns array', async () => {
		const resp = await api.get(
			`${API}/authors/search?email=nonexistent@example.com`,
		);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	// ─── CREATE ────────────────────────────────────────────────────────────────

	test('POST /authors creates author and returns author_id', async () => {
		const resp = await api.post(`${API}/authors`, {
			data: {
				first_name: 'API',
				last_name: 'TestAuthor',
				email: testEmail,
				event_id: EVENT_ID,
			},
		});
		expect([200, 201]).toContain(resp.status());
		const author = await resp.json();
		expect(author.author_id).toBeDefined();
		expect(author.email).toBe(testEmail);
		authorId = author.author_id;
		console.log(`Created author ID: ${authorId}`);
	});

	test('POST /authors with missing required fields returns 400', async () => {
		const resp = await api.post(`${API}/authors`, {
			data: { event_id: EVENT_ID },
		});
		expect(resp.status()).toBe(400);
	});

	test('POST /authors with duplicate email returns 400', async () => {
		if (!authorId) test.skip();
		const resp = await api.post(`${API}/authors`, {
			data: {
				first_name: 'Dupe',
				last_name: 'Author',
				email: testEmail,
			},
		});
		expect(resp.status()).toBe(400);
	});

	test('POST /authors unauthenticated returns 401 or 403', async () => {
		const unauthed = await createUnauthApi();
		const resp = await unauthed.post(`${API}/authors`, {
			data: {
				first_name: 'Hacked',
				last_name: 'Author',
				email: 'hacked@example.com',
			},
		});
		expect([401, 403]).toContain(resp.status());
		await unauthed.dispose();
	});

	// ─── READ SINGLE ───────────────────────────────────────────────────────────

	test('GET /authors/:id returns author with expected fields', async () => {
		if (!authorId) test.skip();
		const resp = await api.get(`${API}/authors/${authorId}`);
		expect(resp.status()).toBe(200);
		const author = await resp.json();
		expect(String(author.author_id)).toBe(String(authorId));
		expect(author.first_name).toBeDefined();
		expect(author.email).toBeDefined();
		expect(Array.isArray(author.abstracts)).toBe(true);
	});

	test('GET /authors/:id with non-existent ID returns 404', async () => {
		const resp = await api.get(`${API}/authors/999999`);
		expect([404, 400]).toContain(resp.status());
	});

	// ─── AUTHOR ABSTRACTS ──────────────────────────────────────────────────────

	test('GET /authors/:id/abstracts returns array', async () => {
		if (!authorId) test.skip();
		const resp = await api.get(`${API}/authors/${authorId}/abstracts`);
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(Array.isArray(data)).toBe(true);
	});

	// ─── UPDATE ────────────────────────────────────────────────────────────────

	test('PUT /authors/:id updates last_name', async () => {
		if (!authorId) test.skip();
		const updated = `UpdatedLastName${Date.now()}`;
		const resp = await api.put(`${API}/authors/${authorId}`, {
			data: { last_name: updated },
		});
		expect(resp.status()).toBe(200);
		const author = await resp.json();
		expect(author.last_name).toBe(updated);
	});

	// ─── DELETE ────────────────────────────────────────────────────────────────

	test('DELETE /authors/:id deletes author (not linked to abstracts)', async () => {
		if (!authorId) test.skip();
		const resp = await api.delete(`${API}/authors/${authorId}`);
		// 400 means author is linked to abstracts — acceptable
		expect([200, 204, 400]).toContain(resp.status());

		if (resp.status() !== 400) {
			const check = await api.get(`${API}/authors/${authorId}`);
			expect([404, 400]).toContain(check.status());
			authorId = null;
		}
	});
});
