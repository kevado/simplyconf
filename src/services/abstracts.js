import axios from "@utils/axios";

/**
 * Abstracts Service
 * Handles API calls for abstract CRUD operations and PDF export
 */
class AbstractsService {
	/**
	 * Get all abstracts for a given event
	 * @param {number} eventId - Event ID to filter abstracts
	 * @returns {Promise<Array>} Array of abstract objects
	 */
	async getAll(eventId) {
		try {
			const resp = await axios.get("/abstracts", {
				params: { event_id: eventId },
			});
			return resp.data;
		} catch (error) {
			console.error("Error fetching abstracts:", error);
			throw error;
		}
	}

	/**
	 * Get a single abstract by ID
	 * @param {number} abstractId - Abstract ID
	 * @returns {Promise<Object>} Abstract object
	 */
	async getById(abstractId) {
		try {
			const resp = await axios.get(`/abstracts/${abstractId}`);
			return resp.data;
		} catch (error) {
			console.error("Error fetching abstract:", error);
			throw error;
		}
	}

	/**
	 * Create a new abstract
	 * @param {Object} data - Abstract data payload
	 * @returns {Promise<Object>} Created abstract object
	 */
	async create(data) {
		try {
			const resp = await axios.post("/abstracts", data);
			return resp.data;
		} catch (error) {
			console.error("Error creating abstract:", error);
			throw error;
		}
	}

	/**
	 * Update an existing abstract
	 * @param {number} abstractId - Abstract ID
	 * @param {Object} data - Updated abstract data
	 * @returns {Promise<Object>} Updated abstract object
	 */
	async update(abstractId, data) {
		try {
			const resp = await axios.put(`/abstracts/${abstractId}`, data);
			return resp.data;
		} catch (error) {
			console.error("Error updating abstract:", error);
			throw error;
		}
	}

	/**
	 * Delete an abstract by ID
	 * @param {number} abstractId - Abstract ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(abstractId) {
		try {
			const resp = await axios.delete(`/abstracts/${abstractId}`);
			return resp.data;
		} catch (error) {
			console.error("Error deleting abstract:", error);
			throw error;
		}
	}

	/**
	 * Export an abstract as a PDF
	 * @param {number} abstractId - Abstract ID
	 * @returns {Promise<Object>} PDF export result
	 */
	async exportPDF(abstractId) {
		try {
			const resp = await axios.get(`/export/pdf/${abstractId}`);
			return resp.data;
		} catch (error) {
			console.error("Error exporting abstract to PDF:", error);
			throw error;
		}
	}
}

export default new AbstractsService();
