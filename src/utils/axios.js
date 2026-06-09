import axios from "axios";

// Create axios instance
const axiosInstance = axios.create({
	// eslint-disable-next-line no-undef
	baseURL: simplyconf.apiUrl,
	withCredentials: true, // Enable cookies for WordPress cookie auth (admin area) and JWT for frontend
});

// Initialize with JWT token from localStorage if it exists
const token = localStorage.getItem("simplyconf_token");
if (token) {
	axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// Store reference for Redux dispatch
let store = null;
let clearAuth = null;

export const setStore = (storeInstance) => {
	store = storeInstance;
	// Store the clearAuth action to avoid circular dependency
	if (storeInstance?.dispatch) {
		// Import the action dynamically to avoid circular dependency
		import("@state/authSlice")
			.then(({ clearAuth: clearAuthAction }) => {
				clearAuth = clearAuthAction;
			})
			.catch(() => {
				// Ignore if import fails
			});
	}
};

// add a request interceptor
axiosInstance.interceptors.request.use(
	(config) => {
		// Always use the current token from localStorage
		const currentToken = localStorage.getItem("simplyconf_token");
		if (currentToken) {
			config.headers.Authorization = `Bearer ${currentToken}`;
		} else if (window.simplyconf?.nonce) {
			// Cookie-based auth (admin area) — send WP REST nonce for CSRF protection
			config.headers["X-WP-Nonce"] = window.simplyconf.nonce;
		}
		return config;
	},
	(error) => {
		// Do something with request error
		return Promise.reject(error);
	},
);

// Add a response interceptor
axiosInstance.interceptors.response.use(
	(response) => {
		// Any status code that lie within the range of 2xx cause this function to trigger
		return response;
	},
	(error) => {
		// Handle 401/403 errors (unauthorized/token expired)
		// But only clear token if we actually sent one (to avoid clearing on first request)
		if (
			error.response &&
			(error.response.status === 401 || error.response.status === 403)
		) {
			const hadToken = error.config?.headers?.Authorization;

			// Call sites can opt into "treat 401 as null" by setting _treat401AsNull: true
			// in their axios request config, instead of hard-coding URL patterns here.
			if (!hadToken && error.config?._treat401AsNull) {
				return Promise.resolve({
					data: null,
					status: 401,
					statusText: "Unauthorized",
					headers: {},
					config: error.config,
				});
			}

			if (hadToken) {
				// Clear token
				localStorage.removeItem("simplyconf_token");
				axiosInstance.defaults.headers.common.Authorization = undefined;

				// Clear authentication state using Redux if available
				if (store && clearAuth) {
					store.dispatch(clearAuth());
				}
			}
		}

		return Promise.reject(error);
	},
);

export default axiosInstance;
