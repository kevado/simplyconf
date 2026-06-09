import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import PreferenceService from "@services/preferences";

// Thunks
export const fetchColumnVisibility = createAsyncThunk(
	"preferences/fetchColumnVisibility",
	async ({ eventId, context }, { rejectWithValue }) => {
		try {
			return await PreferenceService.getColumnVisibility(eventId, context);
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const saveColumnVisibility = createAsyncThunk(
	"preferences/saveColumnVisibility",
	async ({ eventId, context, visibility }, { rejectWithValue }) => {
		try {
			await PreferenceService.saveColumnVisibility(
				eventId,
				context,
				visibility,
			);
			return { context, visibility };
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

const preferenceSlice = createSlice({
	name: "preferences",
	initialState: {
		columnVisibility: {
			abstracts: null,
			authors: null,
			reviews: null,
			users: null,
			submissions: null,
			tracks: null,
			registrations: null,
		},
		isLoading: false,
		hasError: false,
		errorMessage: "",
	},
	reducers: {
		setColumnVisibility: (state, action) => {
			const { context, visibility } = action.payload;
			state.columnVisibility[context] = visibility;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchColumnVisibility.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchColumnVisibility.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				// action.meta.arg contains the original arguments
				const { context } = action.meta.arg;
				state.columnVisibility[context] = action.payload;
			})
			.addCase(fetchColumnVisibility.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(saveColumnVisibility.fulfilled, (state, action) => {
				const { context, visibility } = action.payload;
				state.columnVisibility[context] = visibility;
			});
	},
});

export const { setColumnVisibility } = preferenceSlice.actions;
export default preferenceSlice.reducer;
