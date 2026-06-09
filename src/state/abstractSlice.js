import {
	createAsyncThunk,
	createSelector,
	createSlice,
} from "@reduxjs/toolkit";
import AbstractService from "@services/abstracts";
import { normalize, schema } from "normalizr";

const abstract = new schema.Entity("abstracts", undefined, {
	idAttribute: ({ abstract_id }) => abstract_id,
});

const initialState = {
	abstracts: {},
	abstractIds: [],
	abstractId: null,
	isLoading: false,
	hasError: false,
	errorMessage: "",
};

export const getAbstracts = createAsyncThunk(
	"abstracts/getAll",
	async (eventId, { getState, rejectWithValue }) => {
		try {
			// Use passed eventId or fall back to getting from store
			const actualEventId = eventId || getState().events.globalId;
			const abstracts = await AbstractService.getAll(actualEventId);
			const normalized = normalize(abstracts, [abstract]);
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const createAbstract = createAsyncThunk(
	"abstracts/create",
	async ({ payload }, { dispatch, rejectWithValue }) => {
		try {
			const abstractData = await AbstractService.create(payload);
			const normalized = normalize(abstractData, abstract);
			dispatch(getAbstracts()); // Will use getEventId() fallback
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const updateAbstract = createAsyncThunk(
	"abstracts/update",
	async ({ absId, payload }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await AbstractService.update(absId, payload);
			const normalized = normalize(updated, abstract);
			dispatch(getAbstracts()); // Will use getEventId() fallback
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const deleteAbstract = createAsyncThunk(
	"abstracts/remove",
	async ({ absId }, { rejectWithValue }) => {
		try {
			await AbstractService.delete(absId);
			return absId; // Return the deleted ID for component-level handling
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const bulkDeleteAbstracts = createAsyncThunk(
	"abstracts/bulkDelete",
	async (absIds, { dispatch }) => {
		// Delete all abstracts
		await Promise.all(absIds.map((id) => AbstractService.delete(id)));

		// Refresh the list once after all deletions
		dispatch(getAbstracts());

		return absIds; // Return deleted IDs
	},
);

export const getAbstractById = createAsyncThunk(
	"abstracts/getById",
	async (abstractId, { rejectWithValue }) => {
		try {
			const abs = await AbstractService.getById(abstractId);
			return abs;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const exportAbstractPDF = createAsyncThunk(
	"abstracts/exportPDF",
	async (abstractId, { rejectWithValue }) => {
		try {
			const data = await AbstractService.exportPDF(abstractId);

			if (!data.content || !data.filename) {
				return rejectWithValue("Invalid response from server");
			}

			return { content: data.content, filename: data.filename };
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

const abstractSlice = createSlice({
	name: "abstracts",
	initialState,
	reducers: {
		setAbstractId(state, action) {
			state.abstractId = Number.parseInt(action.payload, 10);
		},
		clearAbstracts(state) {
			state.abstracts = {};
			state.abstractIds = [];
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getAbstracts.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getAbstracts.fulfilled, (state, action) => {
				state.abstracts = action.payload.entities.abstracts ?? {};
				state.abstractIds = action.payload.result;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getAbstracts.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(createAbstract.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(createAbstract.fulfilled, (state, action) => {
				state.abstracts = {
					...state.abstracts,
					...action.payload.entities.abstracts,
				};
				state.abstractIds = [...state.abstractIds, action.payload.result];
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(createAbstract.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(updateAbstract.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(updateAbstract.fulfilled, (state, action) => {
				state.abstracts = {
					...state.abstracts,
					...action.payload.entities.abstracts,
				};
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateAbstract.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(deleteAbstract.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(deleteAbstract.fulfilled, (state, action) => {
				const absId = action.payload;
				const { [absId]: removed, ...remaining } = state.abstracts;
				state.abstracts = remaining;
				state.abstractIds = state.abstractIds.filter((id) => id !== absId);
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(deleteAbstract.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(getAbstractById.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getAbstractById.fulfilled, (state, action) => {
				const abs = action.payload;
				if (abs?.abstract_id) {
					state.abstracts[abs.abstract_id] = abs;
					if (!state.abstractIds.includes(abs.abstract_id)) {
						state.abstractIds.push(abs.abstract_id);
					}
				}
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getAbstractById.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			});
	},
});

export const { setAbstractId, clearAbstracts } = abstractSlice.actions;
export default abstractSlice.reducer;

export const selectUserAbstractsByEvent = createSelector(
	[
		(state) => state.abstracts.abstracts,
		(state) => state.auth?.user,
		(_state, eventId) => eventId,
	],
	(abstracts, currentUser, eventId) => {
		if (!abstracts || !currentUser) return [];
		const userId = currentUser.user_id || currentUser.ID;
		return Object.values(abstracts).filter(
			(abs) =>
				Number.parseInt(abs.event_id, 10) === eventId &&
				Number.parseInt(abs.submit_by, 10) === Number.parseInt(userId, 10),
		);
	},
);
