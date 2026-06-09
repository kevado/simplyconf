import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import AuthService from "@services/auth";

// Helper function to strip HTML tags from strings
const stripHtml = (html) => {
	const tmp = document.createElement("div");
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || "";
};

export const login = createAsyncThunk(
	"auth/login",
	async (payload, { dispatch, rejectWithValue }) => {
		try {
			// Step 1: Validating credentials
			dispatch(
				updateProgress({
					currentStep: 0,
					message: "Validating credentials...",
					percentage: 25,
				}),
			);

			// Small delay to show the progress
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Step 2: Authenticating with server
			dispatch(
				updateProgress({
					currentStep: 1,
					message: "Authenticating with server...",
					percentage: 50,
				}),
			);

			const result = await AuthService.login(payload);

			// Check if login was actually successful
			if (!result.success) {
				dispatch(clearProgress());
				return rejectWithValue(stripHtml(result.message) || "Login failed");
			}

			// Step 3: Loading user profile
			dispatch(
				updateProgress({
					currentStep: 2,
					message: "Loading user profile...",
					percentage: 75,
				}),
			);

			// Small delay to simulate profile loading
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Step 4: Complete
			dispatch(
				updateProgress({
					currentStep: 3,
					message: "Login successful!",
					percentage: 100,
				}),
			);

			return result;
		} catch (e) {
			dispatch(clearProgress());
			return rejectWithValue(
				stripHtml(e.response?.data?.message) || "Login failed",
			);
		}
	},
);

export const register = createAsyncThunk(
	"auth/register",
	async (payload, { dispatch, rejectWithValue }) => {
		try {
			// Step 1: Creating account
			dispatch(
				updateProgress({
					currentStep: 0,
					message: "Creating account...",
					percentage: 20,
				}),
			);

			await new Promise((resolve) => setTimeout(resolve, 500));

			// Step 2: Setting up authentication
			dispatch(
				updateProgress({
					currentStep: 1,
					message: "Setting up authentication...",
					percentage: 40,
				}),
			);

			const result = await AuthService.register(payload);

			// Step 3: Building user profile
			dispatch(
				updateProgress({
					currentStep: 2,
					message: "Building user profile...",
					percentage: 60,
				}),
			);

			await new Promise((resolve) => setTimeout(resolve, 400));

			// Step 4: Processing custom fields
			dispatch(
				updateProgress({
					currentStep: 3,
					message: "Processing custom fields...",
					percentage: 80,
				}),
			);

			await new Promise((resolve) => setTimeout(resolve, 300));

			// Step 5: Finalizing registration
			dispatch(
				updateProgress({
					currentStep: 4,
					message: "Finalizing registration...",
					percentage: 100,
				}),
			);

			return result;
		} catch (e) {
			dispatch(clearProgress());
			return rejectWithValue(
				e.response?.data?.message || "Registration failed",
			);
		}
	},
);

export const forgotPassword = createAsyncThunk(
	"auth/forgot",
	async (email, { rejectWithValue }) => {
		try {
			return await AuthService.forgotPassword(email);
		} catch (e) {
			return rejectWithValue(e.response?.data?.message || "Request failed");
		}
	},
);

export const resetPassword = createAsyncThunk(
	"auth/reset",
	async (payload, { rejectWithValue }) => {
		try {
			return await AuthService.resetPassword(payload);
		} catch (e) {
			return rejectWithValue(e.response?.data?.message || "Reset failed");
		}
	},
);

export const logout = createAsyncThunk("auth/logout", async () => {
	return await AuthService.logout();
});

export const checkSession = createAsyncThunk(
	"auth/checkSession",
	async (_, { rejectWithValue }) => {
		try {
			const session = await AuthService.getSession();
			if (!session) {
				// User is not authenticated, but this is not an error
				return rejectWithValue("Not authenticated");
			}
			return session;
		} catch (_e) {
			return rejectWithValue("Not authenticated");
		}
	},
);

const authSlice = createSlice({
	name: "auth",
	initialState: {
		user: null,
		isAuthenticated: false,
		isLoading: false,
		hasError: false,
		errorMessage: "",
		successMessage: "",
		// Progress tracking
		progress: {
			currentStep: 0,
			message: "",
			percentage: 0,
			isActive: false,
		},
	},
	reducers: {
		setAuthenticated(state, action) {
			state.isAuthenticated = action.payload;
		},
		clearAuth(state) {
			state.isAuthenticated = false;
			state.user = null;
			state.isLoading = false;
			state.hasError = false;
			state.errorMessage = "";
			state.successMessage = "";
			state.progress = {
				currentStep: 0,
				message: "",
				percentage: 0,
				isActive: false,
			};
		},
		clearMessages(state) {
			state.hasError = false;
			state.errorMessage = "";
			state.successMessage = "";
		},
		updateProgress(state, action) {
			state.progress = {
				...state.progress,
				...action.payload,
				isActive: true,
			};
		},
		clearProgress(state) {
			state.progress = {
				currentStep: 0,
				message: "",
				percentage: 0,
				isActive: false,
			};
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(login.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(login.fulfilled, (state, action) => {
				state.isLoading = false;
				state.progress.isActive = false;

				// Only set authenticated state if login was actually successful
				if (action.payload.success) {
					state.isAuthenticated = true;
					state.user = action.payload.user || null;
					state.successMessage = "Login successful!";
				} else {
					// Login failed but thunk completed - set error state
					state.hasError = true;
					state.errorMessage =
						stripHtml(action.payload.message) || "Login failed";
					state.isAuthenticated = false;
					state.user = null;
				}
			})
			.addCase(login.rejected, (state, action) => {
				state.isLoading = false;
				state.isAuthenticated = false;
				state.hasError = true;
				state.errorMessage = stripHtml(action.payload) || "Login failed";
				state.progress.isActive = false;
			})
			.addCase(register.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(register.fulfilled, (state, _action) => {
				state.isLoading = false;
				state.successMessage = "Registration successful!";
				state.progress.isActive = false;
			})
			.addCase(register.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage = action.payload;
				state.progress.isActive = false;
			})
			.addCase(forgotPassword.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(forgotPassword.fulfilled, (state, _action) => {
				state.isLoading = false;
				state.successMessage = "Password reset email sent!";
			})
			.addCase(forgotPassword.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage = action.payload;
			})
			.addCase(resetPassword.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(resetPassword.fulfilled, (state, _action) => {
				state.isLoading = false;
				state.successMessage = "Password reset successful!";
			})
			.addCase(resetPassword.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage = action.payload;
			})
			.addCase(logout.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(logout.fulfilled, (state) => {
				state.isAuthenticated = false;
				state.user = null;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				state.successMessage = "";
			})
			.addCase(logout.rejected, (state) => {
				// Even on error, clear auth state
				state.isAuthenticated = false;
				state.user = null;
				state.isLoading = false;
			})
			.addCase(checkSession.fulfilled, (state, action) => {
				state.isAuthenticated = true;
				state.user = action.payload;
			})
			.addCase(checkSession.rejected, (state) => {
				state.isAuthenticated = false;
				state.user = null;
			});
	},
});

export const {
	setAuthenticated,
	clearAuth,
	clearMessages,
	updateProgress,
	clearProgress,
} = authSlice.actions;

export default authSlice.reducer;
