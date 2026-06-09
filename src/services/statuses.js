import axios from "@utils/axios";

/**
 * Status Service
 * Handles dynamic status management for abstracts and reviews
 */
class StatusService {
	/**
	 * Get all statuses for a specific event and type
	 * @param {number} eventId - Event ID
	 * @param {string} type - Status type ('abstract' or 'review')
	 * @returns {Promise<Array>} Array of status objects
	 */
	async getStatuses(eventId, type = "abstract") {
		const resp = await axios.get("/statuses", {
			params: { event_id: eventId, type },
		});
		return resp.data;
	}

	/**
	 * Get a specific status by ID
	 * @param {number} statusId - Status ID
	 * @returns {Promise<Object>} Status object
	 */
	async getStatus(statusId) {
		const resp = await axios.get(`/statuses/${statusId}`);
		return resp.data;
	}

	/**
	 * Get status by name within an event
	 * @param {number} eventId - Event ID
	 * @param {string} type - Status type ('abstract' or 'review')
	 * @param {string} name - Status name
	 * @returns {Promise<Object>} Status object
	 */
	async getStatusByName(eventId, type, name) {
		const resp = await axios.get("/statuses/by-name", {
			params: { event_id: eventId, type, name },
		});
		return resp.data;
	}

	/**
	 * Create a new status
	 * @param {Object} statusData - Status data
	 * @returns {Promise<Object>} Created status object
	 */
	async createStatus(statusData) {
		const resp = await axios.post("/statuses", statusData);
		return resp.data;
	}

	/**
	 * Update an existing status
	 * @param {number} statusId - Status ID
	 * @param {Object} statusData - Updated status data
	 * @returns {Promise<Object>} Updated status object
	 */
	async updateStatus(statusId, statusData) {
		const resp = await axios.put(`/statuses/${statusId}`, statusData);
		return resp.data;
	}

	/**
	 * Delete a status
	 * @param {number} statusId - Status ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async deleteStatus(statusId) {
		const resp = await axios.delete(`/statuses/${statusId}`);
		return resp.data;
	}

	/**
	 * Initialize default statuses for an event
	 * @param {number} eventId - Event ID
	 * @param {string} type - Status type ('abstract' or 'review')
	 * @returns {Promise<Array>} Initialized statuses array
	 */
	async initializeDefaultStatuses(eventId, type = "abstract") {
		const resp = await axios.post("/statuses/initialize", {
			event_id: eventId,
			type,
		});
		return resp.data;
	}

	/**
	 * Get the default status for a specific type
	 * @param {number} eventId - Event ID
	 * @param {string} type - Status type ('abstract' or 'review')
	 * @returns {Promise<Object>} Default status object
	 */
	async getDefaultStatus(eventId, type = "abstract") {
		const resp = await axios.get("/statuses/default", {
			params: { event_id: eventId, type },
		});
		return resp.data;
	}

	/**
	 * Get the initial status for a specific type (used for new submissions)
	 * @param {number} eventId - Event ID
	 * @param {string} type - Status type ('abstract' or 'review')
	 * @returns {Promise<Object>} Initial status object
	 */
	async getInitialStatus(eventId, type = "abstract") {
		const resp = await axios.get("/statuses/initial", {
			params: { event_id: eventId, type },
		});
		return resp.data;
	}

	/**
	 * Update status order
	 * @param {number} eventId - Event ID
	 * @param {string} type - Status type
	 * @param {Array<number>} statusOrder - Array of status IDs in desired order
	 * @returns {Promise<Object>} Update result
	 */
	async updateStatusOrder(eventId, type, statusOrder) {
		const resp = await axios.put("/statuses/order", {
			event_id: eventId,
			type,
			status_order: statusOrder,
		});
		return resp.data;
	}
}

export default new StatusService();
