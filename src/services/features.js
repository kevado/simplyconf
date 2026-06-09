import axios from "@utils/axios";

/**
 * Feature Service
 * Handles feature flag operations
 */
class FeatureService {
	/**
	 * Get all enabled features for the current site
	 * @returns {Promise<{success: boolean, features: string[]}>} Enabled features result
	 */
	async getEnabledFeatures() {
		const response = await axios.get("/features/enabled");
		return response.data;
	}
}

export default new FeatureService();
