import axios from "@utils/axios";

class FrontendService {
	static async getProfile() {
		const resp = await axios.get("/frontend/profile");
		return resp.data;
	}
	static async updateProfile(data) {
		const resp = await axios.put("/frontend/profile", data);
		return resp.data;
	}
	static async getMySubmissions(event_id) {
		const resp = await axios.get(`/frontend/submissions?event_id=${event_id}`);
		return resp.data;
	}

	static async getTrackSubmissions(event_id) {
		const resp = await axios.get(
			`/frontend/track/submissions?event_id=${event_id}`,
		);
		return resp.data;
	}

	static async getMyStats(event_id) {
		const resp = await axios.get("/frontend/dashboard/my-stats", {
			params: { event_id },
		});
		return resp.data;
	}

	static async getActionItems(event_id) {
		const resp = await axios.get("/frontend/dashboard/action-items", {
			params: { event_id },
		});
		return resp.data;
	}

	static async getActivity(event_id, limit = 5) {
		const resp = await axios.get("/frontend/dashboard/activity", {
			params: { event_id, limit },
		});
		return resp.data;
	}
}

export default FrontendService;
