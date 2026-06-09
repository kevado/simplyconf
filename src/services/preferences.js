import axios from "@utils/axios";

/**
 * Preference Service
 * Handles user preference storage for column visibility and other per-user settings
 */
class PreferenceService {
	/**
	 * Get user preferences
	 * @param {number} eventId - Event ID
	 * @param {string} context - Context (abstracts|authors|reviews|users)
	 * @param {string|null} preferenceKey - Optional specific key
	 * @returns {Promise<Array>} Array of preference objects
	 */
	async get(eventId, context, preferenceKey = null) {
		const params = { event_id: eventId, context };
		if (preferenceKey) params.preference_key = preferenceKey;
		const response = await axios.get("/preferences", { params });
		return response.data;
	}

	/**
	 * Get column visibility preference
	 * @param {number} eventId - Event ID
	 * @param {string} context - Context (abstracts|authors|reviews|users)
	 * @returns {Promise<Object|null>} Column visibility object or null
	 */
	async getColumnVisibility(eventId, context) {
		const prefs = await this.get(eventId, context, "column_visibility");
		return prefs.length > 0 ? prefs[0].preference_value : null;
	}

	/**
	 * Save preference
	 * @param {number} eventId - Event ID
	 * @param {string} context - Context
	 * @param {string} preferenceKey - Preference key
	 * @param {Object} preferenceValue - Preference value object
	 * @returns {Promise<Object>} Saved preference object
	 */
	async save(eventId, context, preferenceKey, preferenceValue) {
		const response = await axios.post("/preferences", {
			event_id: eventId,
			context,
			preference_key: preferenceKey,
			preference_value: preferenceValue,
		});
		return response.data;
	}

	/**
	 * Save column visibility
	 * @param {number} eventId - Event ID
	 * @param {string} context - Context
	 * @param {Object} visibility - Column visibility object
	 * @returns {Promise<Object>} Saved preference object
	 */
	async saveColumnVisibility(eventId, context, visibility) {
		return this.save(eventId, context, "column_visibility", visibility);
	}

	/**
	 * Delete preference
	 * @param {number} preferenceId - Preference ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(preferenceId) {
		const response = await axios.delete(`/preferences/${preferenceId}`);
		return response.data;
	}
}

export default new PreferenceService();
