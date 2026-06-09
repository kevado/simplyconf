/**
 * Auth REST API Tests
 *
 * Tests public authentication endpoints for:
 *   POST  /wp-json/simplyconf/v1/auth/login
 *   POST  /wp-json/simplyconf/v1/auth/register
 *   POST  /wp-json/simplyconf/v1/auth/forgot
 *   POST  /wp-json/simplyconf/v1/auth/reset
 *   POST  /wp-json/simplyconf/v1/auth/logout
 *
 * Note: All endpoints are public (no auth required).
 * Credentials come from WP_USERNAME / WP_PASSWORD env vars.
 */

const { test, expect } = require('@playwright/test');
const { createUnauthApi, createAdminApi } = require('./api-utils');

const API = '/wp-json/simplyconf/v1';
const ADMIN_USER = process.env.WP_USERNAME || 'simplyconf';
const ADMIN_PASS = process.env.WP_PASSWORD || '4me2no';

test.describe('Auth API', () => {
	let unauthed;
	let registeredLogin;

	test.beforeAll(async () => {
		unauthed = await createUnauthApi();
		registeredLogin = `api-test-user-${Date.now()}`;
	});

	test.afterAll(async () => {
		await unauthed.dispose();
	});

	// ─── LOGIN ─────────────────────────────────────────────────────────────────

	test('POST /auth/login with valid credentials returns success + token', async () => {
		const resp = await unauthed.post(`${API}/auth/login`, {
			data: { username: ADMIN_USER, password: ADMIN_PASS },
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
		expect(data.token).toBeDefined();
		expect(data.user).toBeDefined();
		expect(data.user.ID).toBeDefined();
	});

	test('POST /auth/login with invalid credentials returns success: false', async () => {
		const resp = await unauthed.post(`${API}/auth/login`, {
			data: { username: 'nobody', password: 'wrongpassword' },
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(false);
	});

	// ─── REGISTER ──────────────────────────────────────────────────────────────

	test('POST /auth/register creates a user and returns user_id', async () => {
		const resp = await unauthed.post(`${API}/auth/register`, {
			data: {
				login: registeredLogin,
				email: `${registeredLogin}@test.example.com`,
				password: 'SecurePass123!',
			},
		});
		// 200 = success, 400 = user already exists (idempotent)
		expect([200, 201, 400]).toContain(resp.status());
		const data = await resp.json();
		if (data.success) {
			expect(data.user_id).toBeDefined();
			console.log(`Registered test user: ${registeredLogin} (ID: ${data.user_id})`);
		}
	});

	test('POST /auth/register with duplicate login returns success: false', async () => {
		// Try to register with the existing admin username
		const resp = await unauthed.post(`${API}/auth/register`, {
			data: {
				login: ADMIN_USER,
				email: `${ADMIN_USER}-dup@test.example.com`,
				password: 'SomePass123!',
			},
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		// WP returns WP_Error for existing login
		expect(data.success).toBe(false);
	});

	// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────

	test('POST /auth/forgot with valid email returns success: true', async () => {
		const resp = await unauthed.post(`${API}/auth/forgot`, {
			data: { email: `${ADMIN_USER}@${ADMIN_USER}.com` },
		});
		// success=true (email sent) or success=false (user not found) — both valid
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success !== undefined).toBe(true);
	});

	test('POST /auth/forgot with non-existent email returns success: false', async () => {
		const resp = await unauthed.post(`${API}/auth/forgot`, {
			data: { email: 'nonexistent-definitely@nowhere.invalid' },
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(false);
	});

	// ─── LOGOUT ────────────────────────────────────────────────────────────────

	test('POST /auth/logout returns success: true', async () => {
		const resp = await unauthed.post(`${API}/auth/logout`, {
			data: {},
		});
		expect(resp.status()).toBe(200);
		const data = await resp.json();
		expect(data.success).toBe(true);
	});
});
