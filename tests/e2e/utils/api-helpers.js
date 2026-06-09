const { request } = require('@playwright/test');

/**
 * Create a WordPress user via REST API
 * @param {string} username
 * @param {string} password
 * @param {string} email
 * @param {string} role
 * @returns {Promise<object>} Created user object
 */
async function createTestUser(username, password, email, role = 'subscriber') {
	const context = await request.newContext({
		baseURL: process.env.WP_BASE_URL || 'http://simplyconf.local',
	});

	// We need to be authenticated as admin to create users
	// Using Basic Auth if available or cookie auth if we were in a browser context,
	// but here we are in a separate request context.
	// For simplicity in this environment, we'll assume we can use Basic Auth with Application Passwords
	// OR we can try to login first.
	// However, a common pattern in WP E2E is to use a setup script or just assume admin can do it.
	// Let's try to use the admin credentials from env.

	const adminUser = process.env.WP_USERNAME || 'admin';
	const adminPass = process.env.WP_PASSWORD || 'admin';
	const token = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

	const response = await context.post('/wp-json/wp/v2/users', {
		headers: {
			Authorization: `Basic ${token}`,
			'Content-Type': 'application/json',
		},
		data: {
			username,
			password,
			email,
			roles: [role],
			name: username,
		},
	});

	if (!response.ok()) {
		// If user already exists, try to fetch it
		if (response.status() === 400) {
			const existingUsers = await context.get(
				`/wp-json/wp/v2/users?search=${username}`,
				{
					headers: {
						Authorization: `Basic ${token}`,
					},
				}
			);
			const users = await existingUsers.json();
			if (users.length > 0) {
				return users[0];
			}
		}
		console.warn(
			`Failed to create user ${username}: ${response.status()} ${await response.text()}`
		);
		return null;
	}

	return await response.json();
}

/**
 * Delete a WordPress user via REST API
 * @param {number} userId
 */
async function deleteTestUser(userId) {
	const context = await request.newContext({
		baseURL: process.env.WP_BASE_URL || 'http://simplyconf.local',
	});

	const adminUser = process.env.WP_USERNAME || 'admin';
	const adminPass = process.env.WP_PASSWORD || 'admin';
	const token = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

	await context.delete(`/wp-json/wp/v2/users/${userId}?reassign=1&force=true`, {
		headers: {
			Authorization: `Basic ${token}`,
		},
	});
}

module.exports = {
	createTestUser,
	deleteTestUser,
};
