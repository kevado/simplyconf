import axios from "@utils/axios";

class DashboardService {
	/**
	 * Get dashboard statistics
	 * @param {number|null} eventId - Optional event ID to filter stats
	 * @returns {Promise<Object>} Dashboard stats
	 */
	async getStats(eventId = null) {
		const params = eventId ? { event_id: eventId } : {};
		const response = await axios.get("/dashboard/stats", { params });
		return response.data;
	}

	/**
	 * Get recent activity
	 * @param {number|null} eventId - Optional event ID to filter activity
	 * @param {number} limit - Number of activities to fetch (default 20)
	 * @returns {Promise<Object>} Recent activity data
	 */
	async getActivity(eventId = null, limit = 20) {
		const params = { limit };
		if (eventId) {
			params.event_id = eventId;
		}
		const response = await axios.get("/dashboard/activity", { params });
		return response.data;
	}
}

export default new DashboardService();
