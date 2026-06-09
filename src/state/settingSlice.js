import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import SettingService from "@services/settings";
import { normalize, schema } from "normalizr";
import { createSelector } from "reselect";

const setting = new schema.Entity("settings", undefined, {
	idAttribute: "setting_id",
});

const initialState = {
	settings: {
		abstract: [],
		event: [],
		review: [],
		user: [],
		email: [],
		schedule: [],
		payment: [],
	},
	settingIds: [],
	terminology: {}, // Terminology overrides for entities
	isLoading: false,
	hasError: false,
	errorMessage: "",
};

// Async thunk to fetch settings and normalize them by category
export const getSettings = createAsyncThunk(
	"settings/getAll",
	async (eventId, { rejectWithValue }) => {
		try {
			// If no eventId provided, we can't fetch settings
			if (!eventId) {
				return rejectWithValue("Event ID is required to fetch settings");
			}

			const settings = await SettingService.getAll(eventId); // Fetch settings from API

			// Normalize settings by 'setting_id' first
			const normalized = normalize(settings, [setting]);

			// Group settings by category
			const categorizedSettings = settings.reduce((acc, setting) => {
				const category = setting.category || "default"; // Default category if not present
				if (!acc[category]) {
					acc[category] = [];
				}
				acc[category].push(setting);
				return acc;
			}, {});

			return { normalized, categorizedSettings };
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const getPublicUserSettings = createAsyncThunk(
	"settings/getPublicUserSettings",
	async (eventId, { rejectWithValue }) => {
		try {
			// If no eventId provided, we can't fetch settings
			if (!eventId) {
				return rejectWithValue("Event ID is required to fetch settings");
			}

			const settings = await SettingService.getPublicUserSettings(eventId); // Fetch public user settings

			// Return only user settings
			return settings;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const updateSetting = createAsyncThunk(
	"settings/update",
	async ({ settingId, payload, eventId }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await SettingService.update(settingId, payload);
			if (eventId) {
				dispatch(getSettings(eventId));
			}
			return updated;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const updateSettingsBatch = createAsyncThunk(
	"settings/updateBatch",
	async ({ settingsUpdates, eventId }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await SettingService.updateBatch(
				settingsUpdates,
				eventId,
			);
			if (eventId) {
				dispatch(getSettings(eventId));
			}
			return updated;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

const settingsSlice = createSlice({
	name: "settings",
	initialState,
	reducers: {
		setSetting(state, action) {
			const { settingId, value } = action.payload;
			state.settings[settingId] = value;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getSettings.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getSettings.fulfilled, (state, action) => {
				// Ensure we have a valid categorizedSettings object
				const categorizedSettings = action.payload.categorizedSettings || {};

				// Merge with existing structure to ensure all categories exist
				state.settings = {
					abstract: categorizedSettings.abstract || [],
					event: categorizedSettings.event || [],
					review: categorizedSettings.review || [],
					user: categorizedSettings.user || [],
					email: categorizedSettings.email || [],
					schedule: categorizedSettings.schedule || [],
					payment: categorizedSettings.payment || [],
					...categorizedSettings, // Include any additional categories
				};

				// Extract terminology from event category
				const eventSettings = categorizedSettings.event || [];
				const terminologySetting = eventSettings.find(
					(setting) => setting.name === "terminology",
				);

				if (terminologySetting?.value) {
					try {
						state.terminology = JSON.parse(terminologySetting.value);
					} catch (error) {
						console.warn("Failed to parse terminology setting:", error);
						state.terminology = {};
					}
				} else {
					state.terminology = {};
				}

				state.settingIds = action.payload.normalized?.result || [];
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getSettings.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(getPublicUserSettings.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getPublicUserSettings.fulfilled, (state, action) => {
				// Only update user settings, keep other categories as they are
				state.settings.user = action.payload;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getPublicUserSettings.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(updateSetting.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(updateSetting.fulfilled, (state, _action) => {
				// Don't update settings here since updateSetting dispatches getSettings()
				// Just clear loading state - getSettings.fulfilled will handle the data update
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateSetting.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(updateSettingsBatch.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(updateSettingsBatch.fulfilled, (state, _action) => {
				// Don't update settings here since updateSettingsBatch dispatches getSettings()
				// Just clear loading state - getSettings.fulfilled will handle the data update
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateSettingsBatch.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			});
	},
});

// Selector to get a setting by setting_name
export const getSettingByName = createSelector(
	(state) => state.settings.settings,
	(state) => state.settings.settingIds,
	(_, settingName) => settingName,
	(_, __, eventId) => eventId,
	(settings, _settingIds, settingName, eventId) => {
		// Check if settings exist and is an object
		if (!settings || typeof settings !== "object") {
			return null;
		}

		for (const category in settings) {
			// Check if the category exists and is an array
			if (!Array.isArray(settings[category])) {
				continue;
			}

			const setting = settings[category].find(
				(s) =>
					s &&
					s.name === settingName &&
					Number.parseInt(s.event_id, 10) === eventId,
			);
			if (setting) {
				return setting;
			}
		}
		return null;
	},
);

// Simplified selector to get a setting by name within a specific category
export const getSettingByNameAndCategory = createSelector(
	(state, category) => state.settings.settings[category] || [],
	(_, __, settingName) => settingName,
	(_, __, ___, eventId) => eventId,
	(categorySettings, settingName, eventId) => {
		if (!Array.isArray(categorySettings)) {
			return null;
		}

		const setting = categorySettings.find(
			(s) =>
				s &&
				s.name === settingName &&
				Number.parseInt(s.event_id, 10) === eventId,
		);
		return setting || null;
	},
);

// Helper function to safely get boolean setting value
export const getBooleanSetting = (setting, defaultValue = false) => {
	if (!setting || !setting.value) {
		return defaultValue;
	}

	const value = setting.value;
	if (typeof value === "boolean") {
		return value;
	}
	// Handle database string values "1"/"0"
	if (typeof value === "string") {
		return value === "1";
	}
	// Handle numeric values 1/0
	if (typeof value === "number") {
		return value === 1;
	}
	return defaultValue;
};

// Selector to get terminology
export const selectTerminology = (state) => state.settings.terminology;

export const { setSetting } = settingsSlice.actions;
export default settingsSlice.reducer;
