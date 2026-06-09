import axios from "@utils/axios";

class AuthService {
	async login({ username, password, recaptcha_token }) {
		const event_id = window.simplyconf?.eventId || null;
		const resp = await axios.post("/auth/login", {
			username,
			password,
			recaptcha_token,
			event_id,
		});

		if (resp.data.success && resp.data.token) {
			// Store token in localStorage
			localStorage.setItem("simplyconf_token", resp.data.token);
			// Update axios default headers
			axios.defaults.headers.common.Authorization = `Bearer ${resp.data.token}`;
		}

		return resp.data;
	}

	async register({
		login,
		email,
		password,
		display_name,
		custom_fields,
		recaptcha_token,
	}) {
		const event_id = window.simplyconf?.eventId || null;
		const resp = await axios.post("/auth/register", {
			login,
			email,
			password,
			display_name,
			custom_fields,
			recaptcha_token,
			event_id,
		});
		return resp.data;
	}

	async forgotPassword(email) {
		const resp = await axios.post("/auth/forgot", { email });
		return resp.data;
	}

	async resetPassword({ key, login, password }) {
		const resp = await axios.post("/auth/reset", { key, login, password });
		return resp.data;
	}

	async logout() {
		// Call backend FIRST while JWT is still present so wp_logout()
		// can identify the user and clear the WP auth cookies.
		try {
			await axios.post("/auth/logout");
		} catch (_error) {
			// Ignore — we'll clear client state regardless
		}

		// Now clear client-side auth state
		localStorage.removeItem("simplyconf_token");
		axios.defaults.headers.common.Authorization = undefined;

		return { success: true };
	}

	async getSession() {
		// Use the frontend profile endpoint to get current user roles and info for a specific event
		const event_id = window.simplyconf?.eventId || null;
		const config = event_id
			? { params: { event_id }, _treat401AsNull: true }
			: { _treat401AsNull: true };
		const resp = await axios.get("/frontend/profile", config);

		// Handle the mock response from axios interceptor (when user is not authenticated)
		if (resp.status === 401 && resp.data === null) {
			return null;
		}

		return resp.data;
	}
}

export default new AuthService();
