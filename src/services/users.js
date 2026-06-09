import axios from "@utils/axios";

/**
 * Users Service
 * Handles API calls for user CRUD operations, syncing, and event-user role management
 */
class UsersService {
	/**
	 * Get all users with optional filtering parameters
	 * @param {Object} params - Query parameters for filtering
	 * @returns {Promise<Array>} Array of user objects
	 */
	async getAll(params = {}) {
		try {
			const resp = await axios.get("/users", { params });
			return resp.data;
		} catch (error) {
			console.error("Error fetching users:", error);
			throw error;
		}
	}

	/**
	 * Get a single user by ID
	 * @param {number} userId - User ID
	 * @returns {Promise<Object>} User object
	 */
	async getById(userId) {
		try {
			const resp = await axios.get(`/users/${userId}`);
			return resp.data;
		} catch (error) {
			console.error("Error fetching user:", error);
			throw error;
		}
	}

	/**
	 * Create a new user
	 * @param {Object} data - User data payload
	 * @returns {Promise<Object>} Created user object
	 */
	async create(data) {
		try {
			const resp = await axios.post("/users", data);
			return resp.data;
		} catch (error) {
			console.error("Error creating user:", error);
			throw error;
		}
	}

	/**
	 * Update an existing user
	 * @param {number} userId - User ID
	 * @param {Object} data - Updated user data
	 * @returns {Promise<Object>} Updated user object
	 */
	async update(userId, data) {
		try {
			const resp = await axios.put(`/users/${userId}`, data);
			return resp.data;
		} catch (error) {
			console.error("Error updating user:", error);
			throw error;
		}
	}

	/**
	 * Delete a user by ID
	 * @param {number} userId - User ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(userId) {
		try {
			const resp = await axios.delete(`/users/${userId}`);
			return resp.data;
		} catch (error) {
			console.error("Error deleting user:", error);
			throw error;
		}
	}

	/**
	 * Sync WordPress users with SimplyConf
	 * @returns {Promise<Object>} Sync result with counts
	 */
	async sync() {
		try {
			const resp = await axios.get("/users/sync");
			return resp.data;
		} catch (error) {
			console.error("Error syncing users:", error);
			throw error;
		}
	}

	/**
	 * Get all users associated with a specific event
	 * @param {number} eventId - Event ID
	 * @returns {Promise<Array>} Array of event-user objects
	 */
	async getEventUsers(eventId) {
		const resp = await axios.get("/event-users", {
			params: { event_id: eventId },
		});
		return resp.data;
	}

	/**
	 * Set one or more roles for a user within an event
	 * Supports both a single role (legacy) and multiple roles via separate endpoints
	 * @param {number} eventId - Event ID
	 * @param {number} userId - User ID
	 * @param {string|string[]} roles - A single role string or an array of role strings
	 * @returns {Promise<Object>} Result of the role assignment
	 */
	async setEventUserRole(eventId, userId, roles) {
		// Support both single role (legacy) and multiple roles
		if (Array.isArray(roles)) {
			// Multiple roles - use the new endpoint
			const resp = await axios.post("/event-users/roles", {
				event_id: eventId,
				user_id: userId,
				roles,
			});
			return resp.data;
		}
		// Single role - use the legacy endpoint for backward compatibility
		const resp = await axios.post("/event-users/role", {
			event_id: eventId,
			user_id: userId,
			role: roles,
		});
		return resp.data;
	}
}

export default new UsersService();
