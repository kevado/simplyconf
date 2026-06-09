import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import statusService from "@services/statuses";

// Helper function to convert string boolean values to actual booleans
const convertBooleanFields = (status) => {
	return {
		...status,
		is_default: Boolean(Number.parseInt(status.is_default, 10)),
		is_initial: Boolean(Number.parseInt(status.is_initial, 10)),
		is_final: Boolean(Number.parseInt(status.is_final, 10)),
		exclusive: Boolean(Number.parseInt(status.exclusive || 0, 10)),
	};
};

// Helper function to convert array of statuses
const convertStatusArray = (statuses) => {
	return statuses.map(convertBooleanFields);
};

// Async thunks
export const fetchStatuses = createAsyncThunk(
	"statuses/fetchStatuses",
	async ({ eventId, type = "abstract" }, { rejectWithValue }) => {
		try {
			const statuses = await statusService.getStatuses(eventId, type);
			return {
				eventId,
				type,
				statuses,
			};
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const fetchStatusByName = createAsyncThunk(
	"statuses/fetchStatusByName",
	async ({ eventId, type, name }, { rejectWithValue }) => {
		try {
			return await statusService.getStatusByName(eventId, type, name);
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const createStatus = createAsyncThunk(
	"statuses/createStatus",
	async (statusData, { rejectWithValue }) => {
		try {
			return await statusService.createStatus(statusData);
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const updateStatus = createAsyncThunk(
	"statuses/updateStatus",
	async ({ statusId, statusData }, { rejectWithValue }) => {
		try {
			return await statusService.updateStatus(statusId, statusData);
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const deleteStatus = createAsyncThunk(
	"statuses/deleteStatus",
	async (statusId, { rejectWithValue }) => {
		try {
			await statusService.deleteStatus(statusId);
			return statusId;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const initializeDefaultStatuses = createAsyncThunk(
	"statuses/initializeDefaultStatuses",
	async ({ eventId, type = "abstract" }, { rejectWithValue }) => {
		try {
			const statuses = await statusService.initializeDefaultStatuses(
				eventId,
				type,
			);
			return {
				eventId,
				type,
				statuses,
			};
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const fetchDefaultStatus = createAsyncThunk(
	"statuses/fetchDefaultStatus",
	async ({ eventId, type = "abstract" }, { rejectWithValue }) => {
		try {
			const status = await statusService.getDefaultStatus(eventId, type);
			return { eventId, type, status };
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const fetchInitialStatus = createAsyncThunk(
	"statuses/fetchInitialStatus",
	async ({ eventId, type = "abstract" }, { rejectWithValue }) => {
		try {
			const status = await statusService.getInitialStatus(eventId, type);
			return { eventId, type, status };
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

// Initial state
const initialState = {
	statuses: {}, // { eventId: { type: [statuses] } }
	defaultStatuses: {}, // { eventId: { type: status } }
	initialStatuses: {}, // { eventId: { type: status } }
	isLoading: false,
	hasError: false,
	errorMessage: "",
};

// Slice
const statusSlice = createSlice({
	name: "statuses",
	initialState,
	reducers: {
		clearError: (state) => {
			state.hasError = false;
			state.errorMessage = "";
		},
		clearStatuses: (state) => {
			state.statuses = {};
			state.defaultStatuses = {};
			state.initialStatuses = {};
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch statuses
			.addCase(fetchStatuses.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchStatuses.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				const { eventId, type, statuses } = action.payload;
				if (!state.statuses[eventId]) {
					state.statuses[eventId] = {};
				}
				state.statuses[eventId][type] = convertStatusArray(statuses);
			})
			.addCase(fetchStatuses.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})

			// Fetch status by name
			.addCase(fetchStatusByName.fulfilled, (_state, _action) => {
				// This is mainly for getting specific status info, no state update needed
			})

			// Create status
			.addCase(createStatus.fulfilled, (state, action) => {
				const newStatus = convertBooleanFields(action.payload);
				const { event_id: eventId, type } = newStatus;
				if (state.statuses[eventId]?.[type]) {
					state.statuses[eventId][type].push(newStatus);
				}
			})

			// Update status
			.addCase(updateStatus.fulfilled, (state, action) => {
				const updatedStatus = convertBooleanFields(action.payload);
				const { event_id: eventId, type } = updatedStatus;

				// Ensure we have the correct data structure
				if (state.statuses[eventId]?.[type]) {
					const index = state.statuses[eventId][type].findIndex(
						(status) =>
							Number.parseInt(status.status_id, 10) ===
							Number.parseInt(updatedStatus.status_id, 10),
					);
					if (index !== -1) {
						// Update the status in place
						state.statuses[eventId][type][index] = updatedStatus;
					} else {
						// If status not found, add it to the array (fallback)
						state.statuses[eventId][type].push(updatedStatus);
					}
				} else {
					// If event/type structure doesn't exist, create it
					if (!state.statuses[eventId]) {
						state.statuses[eventId] = {};
					}
					if (!state.statuses[eventId][type]) {
						state.statuses[eventId][type] = [];
					}
					state.statuses[eventId][type].push(updatedStatus);
				}
			})

			// Delete status
			.addCase(deleteStatus.fulfilled, (state, action) => {
				const statusId = action.payload;
				// Remove from all event/type combinations
				Object.keys(state.statuses).forEach((eventId) => {
					Object.keys(state.statuses[eventId]).forEach((type) => {
						state.statuses[eventId][type] = state.statuses[eventId][
							type
						].filter((status) => status.status_id !== statusId);
					});
				});
			})

			// Initialize default statuses
			.addCase(initializeDefaultStatuses.fulfilled, (state, action) => {
				const { eventId, type, statuses } = action.payload;
				if (!state.statuses[eventId]) {
					state.statuses[eventId] = {};
				}
				state.statuses[eventId][type] = convertStatusArray(statuses);
			})

			// Fetch default status
			.addCase(fetchDefaultStatus.fulfilled, (state, action) => {
				const { eventId, type, status } = action.payload;
				if (!state.defaultStatuses[eventId]) {
					state.defaultStatuses[eventId] = {};
				}
				state.defaultStatuses[eventId][type] = convertBooleanFields(status);
			})

			// Fetch initial status
			.addCase(fetchInitialStatus.fulfilled, (state, action) => {
				const { eventId, type, status } = action.payload;
				if (!state.initialStatuses[eventId]) {
					state.initialStatuses[eventId] = {};
				}
				state.initialStatuses[eventId][type] = convertBooleanFields(status);
			});
	},
});

// Selectors
const EMPTY_ARRAY = [];

export const selectStatuses =
	(eventId, type = "abstract") =>
	(state) => {
		return state.statuses.statuses[eventId]?.[type] || EMPTY_ARRAY;
	};

export const selectStatusById = (eventId, type, statusId) => (state) => {
	const statuses = state.statuses.statuses[eventId]?.[type] || [];
	return statuses.find((status) => status.status_id === statusId);
};

export const selectStatusByName = (eventId, type, name) => (state) => {
	const statuses = state.statuses.statuses[eventId]?.[type] || [];
	return statuses.find((status) => status.name === name);
};

export const selectDefaultStatus =
	(eventId, type = "abstract") =>
	(state) => {
		return state.statuses.defaultStatuses[eventId]?.[type];
	};

export const selectInitialStatus =
	(eventId, type = "abstract") =>
	(state) => {
		return state.statuses.initialStatuses[eventId]?.[type];
	};

export const selectStatusesLoading = (state) => state.statuses.isLoading;
export const selectStatusesError = (state) => state.statuses.hasError;
export const selectStatusesErrorMessage = (state) =>
	state.statuses.errorMessage;

export const { clearError, clearStatuses } = statusSlice.actions;
export default statusSlice.reducer;
