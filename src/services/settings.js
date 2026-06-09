import axios from "@utils/axios";

/**
 * Settings Service
 * Handles API calls for event settings CRUD operations and batch updates
 */
class SettingsService {
	/**
	 * Get all settings for a given event
	 * @param {number} eventId - Event ID
	 * @returns {Promise<Array>} Array of settings objects
	 */
	async getAll(eventId) {
		try {
			const resp = await axios.get("/settings", {
				params: { event_id: eventId },
			});
			return resp.data;
		} catch (error) {
			console.error("Error response:", error.response);
			throw error;
		}
	}

	/**
	 * Get public user-facing settings for a given event
	 * @param {number} eventId - Event ID
	 * @returns {Promise<Object>} Public settings object
	 */
	async getPublicUserSettings(eventId) {
		try {
			const resp = await axios.get("/settings/public", {
				params: { event_id: eventId },
			});
			return resp.data;
		} catch (error) {
			console.error("Error fetching public user settings:", error);
			throw error;
		}
	}

	/**
	 * Create a new settings entry
	 * @param {Object} data - Settings data payload
	 * @returns {Promise<Object>} Created settings object
	 */
	async create(data) {
		try {
			const resp = await axios.post("/settings", data);
			return resp.data;
		} catch (error) {
			console.error("Error creating settings:", error);
			throw error;
		}
	}

	/**
	 * Update settings for a given event
	 * @param {number} eventId - Event ID
	 * @param {Object} data - Updated settings data
	 * @returns {Promise<Object>} Updated settings object
	 */
	async update(eventId, data) {
		try {
			const resp = await axios.put(`/settings/${eventId}`, data);
			return resp.data;
		} catch (error) {
			console.error("Error updating settings:", error);
			throw error;
		}
	}

	/**
	 * Update multiple settings at once, creating any that don't yet exist
	 * @param {Array<Object>} updates - Array of update objects with optional settingId and value
	 * @param {number} eventId - Event ID
	 * @returns {Promise<{success: boolean, updated: number, created: number}>} Batch result summary
	 */
	async updateBatch(updates, eventId) {
		try {
			// Separate updates that have settingId from those that need to be created
			const updatesWithId = updates.filter((update) => update.settingId);
			const updatesToCreate = updates.filter((update) => !update.settingId);

			// Handle updates first
			if (updatesWithId.length > 0) {
				const updateData = {};
				updatesWithId.forEach((update) => {
					updateData[update.settingId] = update.value;
				});
				await axios.put(`/settings/${eventId}`, updateData);
			}

			// Handle creations
			if (updatesToCreate.length > 0) {
				for (const update of updatesToCreate) {
					await this.create(update);
				}
			}

			return {
				success: true,
				updated: updatesWithId.length,
				created: updatesToCreate.length,
			};
		} catch (error) {
			console.error("Error updating batch settings:", error);
			throw error;
		}
	}

	/**
	 * Delete settings for a given event
	 * @param {number} eventId - Event ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(eventId) {
		try {
			const resp = await axios.delete(`/settings/${eventId}`);
			return resp.data;
		} catch (error) {
			console.error("Error deleting settings:", error);
			throw error;
		}
	}
}

export default new SettingsService();
