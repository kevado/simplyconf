import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import FeatureService from "@services/features";

export const fetchEnabledFeatures = createAsyncThunk(
	"features/fetchEnabled",
	async (_, { rejectWithValue }) => {
		try {
			const response = await FeatureService.getEnabledFeatures();
			return response.features;
		} catch (e) {
			return rejectWithValue(
				e.response?.data?.message || e.message || "Failed to fetch features",
			);
		}
	},
);

const featureSlice = createSlice({
	name: "features",
	initialState: {
		enabled: window.simplyconf?.features || [],
		isLoading: false,
		hasError: false,
		errorMessage: "",
	},
	reducers: {
		setFeatures: (state, action) => {
			state.enabled = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchEnabledFeatures.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchEnabledFeatures.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				state.enabled = action.payload;
				// Also update global for backward compatibility
				if (window.simplyconf) {
					window.simplyconf.features = action.payload;
				}
			})
			.addCase(fetchEnabledFeatures.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload || action.error?.message || "Failed to fetch features";
			});
	},
});

export const { setFeatures } = featureSlice.actions;

export const selectEnabledFeatures = (state) => state.features.enabled;
export const selectFeaturesLoading = (state) => state.features.isLoading;
export const selectFeaturesError = (state) => state.features.hasError;
export const selectFeaturesErrorMessage = (state) =>
	state.features.errorMessage;
export const selectHasFeature = (featureSlug) => (state) =>
	state.features.enabled.includes(featureSlug);

export default featureSlice.reducer;
