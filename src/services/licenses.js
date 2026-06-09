// License service for API calls
import axios from "@utils/axios";

const LicenseService = {
	/**
	 * Activate a license
	 */
	activate: async (addon, licenseKey) => {
		const response = await axios.post("/licenses/activate", {
			addon,
			license_key: licenseKey,
		});
		return response.data;
	},

	/**
	 * Deactivate a license
	 */
	deactivate: async (addon) => {
		const response = await axios.post("/licenses/deactivate", {
			addon,
		});
		return response.data;
	},

	/**
	 * Get license status
	 */
	getStatus: async (addon) => {
		const response = await axios.get(`/licenses/status?addon=${addon}`);
		return response.data;
	},

	/**
	 * Validate license (force refresh)
	 */
	validate: async (addon) => {
		const response = await axios.post("/licenses/validate", {
			addon,
		});
		return response.data;
	},

	/**
	 * Get all licenses status
	 */
	getAllStatus: async () => {
		const response = await axios.get("/licenses/all");
		return response.data;
	},
};

export default LicenseService;
