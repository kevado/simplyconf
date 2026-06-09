import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import CustomFieldService from "@services/customFields";

export const fetchCustomFields = createAsyncThunk(
	"customFields/fetch",
	async ({ event_id, usage = null }, { rejectWithValue }) => {
		try {
			return await CustomFieldService.getAll(event_id, usage);
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const createCustomField = createAsyncThunk(
	"customFields/create",
	async (data, { dispatch }) => {
		const res = await CustomFieldService.create(data);
		dispatch(fetchCustomFields({ event_id: data.event_id, usage: data.usage }));
		return res;
	},
);

export const updateCustomField = createAsyncThunk(
	"customFields/update",
	async ({ field_id, data }, { dispatch }) => {
		const res = await CustomFieldService.update(field_id, data);
		dispatch(fetchCustomFields({ event_id: data.event_id, usage: data.usage }));
		return res;
	},
);

export const deleteCustomField = createAsyncThunk(
	"customFields/delete",
	async ({ field_id, event_id, usage }, { dispatch }) => {
		const res = await CustomFieldService.delete(field_id);
		dispatch(fetchCustomFields({ event_id, usage }));
		return res;
	},
);

export const bulkDeleteCustomFields = createAsyncThunk(
	"customFields/bulkDelete",
	async ({ field_ids, event_id, usage }, { dispatch }) => {
		const res = await CustomFieldService.bulkDelete(field_ids);
		dispatch(fetchCustomFields({ event_id, usage }));
		return res;
	},
);

export const toggleCustomFieldVisibility = createAsyncThunk(
	"customFields/toggleVisibility",
	async ({ field_id, show_in_admin, event_id, usage }, { dispatch }) => {
		const res = await CustomFieldService.toggleAdminVisibility(
			field_id,
			show_in_admin,
		);
		dispatch(fetchCustomFields({ event_id, usage }));
		return res;
	},
);

export const fetchPublicUserFields = createAsyncThunk(
	"customFields/fetchPublicUserFields",
	async (eventId, { rejectWithValue }) => {
		try {
			const fields = await CustomFieldService.getPublicUserFields(eventId);
			return fields;
		} catch (error) {
			return rejectWithValue(
				error.message || "Failed to fetch public user fields",
			);
		}
	},
);

const customFieldsSlice = createSlice({
	name: "customFields",
	initialState: {
		abstract: [],
		review: [],
		user: [],
		// Track which event each entity type's fields belong to
		eventId: {
			abstract: null,
			review: null,
			user: null,
		},
		isLoading: {
			abstract: false,
			review: false,
			user: false,
		},
		error: {
			abstract: null,
			review: null,
			user: null,
		},
	},
	reducers: {
		clearCustomFields(state, action) {
			const usage = action.payload;
			if (usage && ["abstract", "review", "user"].includes(usage)) {
				state[usage] = [];
				state.eventId[usage] = null;
			} else {
				// Clear all if no specific usage provided
				state.abstract = [];
				state.review = [];
				state.user = [];
				state.eventId.abstract = null;
				state.eventId.review = null;
				state.eventId.user = null;
			}
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchCustomFields.pending, (state, action) => {
				const usage = action.meta.arg.usage || "abstract";
				state.isLoading[usage] = true;
				state.error[usage] = null;
			})
			.addCase(fetchCustomFields.fulfilled, (state, action) => {
				const usage = action.meta.arg.usage || "abstract";
				const eventId = action.meta.arg.event_id;
				state.isLoading[usage] = false;
				state[usage] = action.payload;
				state.eventId[usage] = eventId;
			})
			.addCase(fetchCustomFields.rejected, (state, action) => {
				const usage = action.meta.arg.usage || "abstract";
				state.isLoading[usage] = false;
				state.error[usage] =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(fetchPublicUserFields.pending, (state) => {
				state.isLoading.user = true;
				state.error.user = null;
			})
			.addCase(fetchPublicUserFields.fulfilled, (state, action) => {
				state.isLoading.user = false;
				state.user = action.payload; // Store raw data directly
				// Note: We don't set eventId for public fields since they're not tied to a specific event context
			})
			.addCase(fetchPublicUserFields.rejected, (state, action) => {
				state.isLoading.user = false;
				state.error.user =
					action.payload || action.error?.message || "An error occurred";
			});
	},
});

// Selector functions for easy access to entity-specific fields
const EMPTY_ARRAY = [];

export const selectAbstractFields = (state) =>
	state.customFields.abstract || EMPTY_ARRAY;
export const selectReviewFields = (state) =>
	state.customFields.review || EMPTY_ARRAY;
export const selectUserFields = (state) =>
	state.customFields.user || EMPTY_ARRAY;
export const selectCustomFieldsByUsage = (state, usage) => {
	return state.customFields[usage] || EMPTY_ARRAY;
};
export const selectIsLoading = (state, usage) => {
	return state.customFields.isLoading[usage] || false;
};
export const selectError = (state, usage) => {
	return state.customFields.error[usage] || null;
};
export const selectEventId = (state, usage) => {
	return state.customFields.eventId[usage] || null;
};

export const { clearCustomFields } = customFieldsSlice.actions;
export default customFieldsSlice.reducer;
