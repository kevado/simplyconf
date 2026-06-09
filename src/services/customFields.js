import axios from "@utils/axios";

/**
 * Custom Field Service
 * Handles API calls for custom field CRUD operations
 */
class CustomFieldService {
	/**
	 * Get all custom fields, optionally filtered by event and usage
	 * @param {number} event_id - Event ID
	 * @param {string|null} usage - Field usage context ('abstract'|'review'|'user'|'author')
	 * @returns {Promise<Array>} Array of custom field objects
	 */
	async getAll(event_id, usage = null) {
		const params = {};
		if (event_id) params.event_id = event_id;
		if (usage) params.usage = usage;
		const res = await axios.get("/customfields", { params });
		return res.data;
	}

	/**
	 * Get public user-facing fields for registration (no authentication required)
	 * @param {number} event_id - Event ID
	 * @returns {Promise<Array>} Array of public user field objects
	 */
	async getPublicUserFields(event_id) {
		const params = { usage: "user" };
		if (event_id) params.event_id = event_id;
		const res = await axios.get("/customfields/public", { params });
		return res.data;
	}

	/**
	 * Create a new custom field
	 * @param {Object} data - Custom field data payload
	 * @returns {Promise<Object>} Created custom field object
	 */
	async create(data) {
		const res = await axios.post("/customfields", data);
		return res.data;
	}

	/**
	 * Update an existing custom field
	 * @param {number} field_id - Field ID
	 * @param {Object} data - Updated field data
	 * @returns {Promise<Object>} Updated custom field object
	 */
	async update(field_id, data) {
		const res = await axios.put(`/customfields/${field_id}`, data);
		return res.data;
	}

	/**
	 * Delete a custom field by ID
	 * @param {number} field_id - Field ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(field_id) {
		const res = await axios.delete(`/customfields/${field_id}`);
		return res.data;
	}

	/**
	 * Toggle admin visibility for a custom field
	 * @param {number} field_id - Field ID
	 * @param {boolean} show_in_admin - Whether to show in admin
	 * @returns {Promise<Object>} Updated field object
	 */
	async toggleAdminVisibility(field_id, show_in_admin) {
		const res = await axios.patch(`/customfields/${field_id}/visibility`, {
			show_in_admin,
		});
		return res.data;
	}

	/**
	 * Delete multiple custom fields at once
	 * @param {number[]} field_ids - Array of field IDs to delete
	 * @returns {Promise<Object>} Bulk deletion result
	 */
	async bulkDelete(field_ids) {
		const res = await axios.delete("/customfields/bulk-delete", {
			data: { field_ids },
		});
		return res.data;
	}
}

export default new CustomFieldService();
