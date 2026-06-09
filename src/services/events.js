import axios from "@utils/axios";

/**
 * Event Service
 * Handles API calls for event CRUD operations and status management
 */
class EventService {
	/**
	 * Get all events
	 * @returns {Promise<Array>} Array of event objects
	 */
	async getAll() {
		try {
			const resp = await axios.get("/events");
			return resp.data;
		} catch (error) {
			console.error("Error fetching events:", error);
			throw error;
		}
	}

	/**
	 * Get a single event by ID
	 * @param {number} id - Event ID
	 * @returns {Promise<Object>} Event object
	 */
	async getById(id) {
		try {
			const resp = await axios.get(`/events/${id}`);
			return resp.data;
		} catch (error) {
			console.error("Error fetching event:", error);
			throw error;
		}
	}

	/**
	 * Create a new event
	 * @param {Object} data - Event data payload
	 * @returns {Promise<Object>} Created event object
	 */
	async create(data) {
		try {
			const resp = await axios.post("/events", data);
			return resp.data;
		} catch (error) {
			console.error("Error creating event:", error);
			throw error;
		}
	}

	/**
	 * Update an existing event
	 * @param {number} id - Event ID
	 * @param {Object} data - Updated event data
	 * @returns {Promise<Object>} Updated event object
	 */
	async update(id, data) {
		try {
			const resp = await axios.put(`/events/${id}`, data);
			return resp.data;
		} catch (error) {
			console.error("Error updating event:", error);
			throw error;
		}
	}

	/**
	 * Set an event as the default event
	 * @param {number} id - Event ID to set as default
	 * @returns {Promise<Object>} Result of the operation
	 */
	async setDefault(id) {
		try {
			const resp = await axios.put(`/events/default/${id}`);
			return resp.data;
		} catch (error) {
			console.error("Error setting default event:", error);
			throw error;
		}
	}

	/**
	 * Delete an event by ID
	 * @param {number} id - Event ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(id) {
		try {
			const resp = await axios.delete(`/events/${id}`);
			return resp.data;
		} catch (error) {
			console.error("Error deleting event:", error);
			throw error;
		}
	}

	/**
	 * Update the status of an event
	 * @param {number} id - Event ID
	 * @param {string} status - New status value
	 * @returns {Promise<Object>} Updated event object
	 */
	async updateStatus(id, status) {
		try {
			const resp = await axios.put(`/events/${id}/status`, { status });
			return resp.data;
		} catch (error) {
			console.error("Error updating event status:", error);
			throw error;
		}
	}
}

export default new EventService();
