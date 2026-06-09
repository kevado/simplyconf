import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "@utils/axios";

/**
 * Async thunk to fetch appearance settings from REST API
 */
export const fetchAppearanceSettings = createAsyncThunk(
	"appearance/fetchSettings",
	async (_, { rejectWithValue }) => {
		try {
			const response = await axios.get("/appearance-settings");
			return response.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message ||
					error.message ||
					"Failed to fetch appearance settings",
			);
		}
	},
);

/**
 * Async thunk to update appearance settings via REST API
 */
export const updateAppearanceSettings = createAsyncThunk(
	"appearance/updateSettings",
	async (settings, { rejectWithValue }) => {
		try {
			const response = await axios.post("/appearance-settings", {
				settings,
			});
			return response.data.data; // Return the updated settings
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message ||
					error.message ||
					"Failed to update appearance settings",
			);
		}
	},
);

/**
 * Async thunk to fetch theme presets
 */
export const fetchThemePresets = createAsyncThunk(
	"appearance/fetchPresets",
	async (_, { rejectWithValue }) => {
		try {
			const response = await axios.get("/appearance-settings/presets");
			return response.data;
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message ||
					error.message ||
					"Failed to fetch theme presets",
			);
		}
	},
);

/**
 * Appearance slice for Redux state management
 */
const appearanceSlice = createSlice({
	name: "appearance",
	initialState: {
		settings: null,
		presets: {},
		isLoading: false,
		updating: false,
		presetsLoading: false,
		hasError: false,
		errorMessage: "",
		lastUpdated: null,
	},
	reducers: {
		/**
		 * Apply settings locally (in-memory) without an API call.
		 * Used to immediately reflect preset/reset changes in the UI
		 * before the user explicitly saves.
		 */
		applyLocalSettings: (state, action) => {
			state.settings = action.payload;
		},

		/**
		 * Reset appearance state
		 */
		resetAppearance: (state) => {
			state.settings = null;
			state.presets = {};
			state.isLoading = false;
			state.updating = false;
			state.presetsLoading = false;
			state.hasError = false;
			state.errorMessage = "";
			state.lastUpdated = null;
		},

		/**
		 * Clear any error state
		 */
		clearAppearanceError: (state) => {
			state.hasError = false;
			state.errorMessage = "";
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch settings cases
			.addCase(fetchAppearanceSettings.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchAppearanceSettings.fulfilled, (state, action) => {
				state.isLoading = false;
				state.settings = action.payload;
				state.lastUpdated = new Date().toISOString();
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchAppearanceSettings.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to fetch appearance settings";
			})

			// Update settings cases
			.addCase(updateAppearanceSettings.pending, (state) => {
				state.updating = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateAppearanceSettings.fulfilled, (state, action) => {
				state.updating = false;
				state.settings = action.payload;
				state.lastUpdated = new Date().toISOString();
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateAppearanceSettings.rejected, (state, action) => {
				state.updating = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to update appearance settings";
			})

			// Fetch presets cases
			.addCase(fetchThemePresets.pending, (state) => {
				state.presetsLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchThemePresets.fulfilled, (state, action) => {
				state.presetsLoading = false;
				state.presets = action.payload;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchThemePresets.rejected, (state, action) => {
				state.presetsLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to fetch theme presets";
			});
	},
});

// Export actions
export const { applyLocalSettings, resetAppearance, clearAppearanceError } =
	appearanceSlice.actions;

// Export selectors
export const selectAppearanceSettings = (state) => state.appearance.settings;
export const selectAppearanceLoading = (state) => state.appearance.isLoading;
export const selectAppearanceUpdating = (state) => state.appearance.updating;
export const selectAppearanceError = (state) => state.appearance.hasError;
export const selectAppearanceErrorMessage = (state) =>
	state.appearance.errorMessage;
export const selectThemePresets = (state) => state.appearance.presets;
export const selectAppearanceLastUpdated = (state) =>
	state.appearance.lastUpdated;

// Export reducer
export default appearanceSlice.reducer;
