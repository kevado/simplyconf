import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import UserService from "@services/users";
import { normalize, schema } from "normalizr";

const user = new schema.Entity("users", undefined, {
	idAttribute: ({ user_id }) => user_id,
});

const initialState = {
	users: {},
	userIds: [],
	userId: null,
	isLoading: false,
	hasError: false,
	errorMessage: "",
};

export const getUsers = createAsyncThunk(
	"users/getAll",
	async (_, { rejectWithValue }) => {
		try {
			const users = await UserService.getAll();
			const normalized = normalize(users, [user]);
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const createUser = createAsyncThunk(
	"users/create",
	async ({ payload }, { dispatch, rejectWithValue }) => {
		try {
			const user = await UserService.create(payload);
			dispatch(getUsers());
			return user;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const updateUser = createAsyncThunk(
	"users/update",
	async ({ userId, payload }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await UserService.update(userId, payload);
			dispatch(getEventUsers());
			return updated;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const deleteUser = createAsyncThunk(
	"users/remove",
	async ({ userId }, { rejectWithValue }) => {
		try {
			await UserService.delete(userId);
			return userId; // Return the deleted ID for component-level handling
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const bulkDeleteUsers = createAsyncThunk(
	"users/bulkDelete",
	async (userIds, { dispatch }) => {
		// Delete all users
		await Promise.all(userIds.map((id) => UserService.delete(id)));

		// Refresh the list once after all deletions
		dispatch(getEventUsers());

		return userIds; // Return deleted IDs
	},
);

export const syncUsers = createAsyncThunk(
	"users/sync",
	async (_, { rejectWithValue }) => {
		try {
			const users = await UserService.sync();
			const normalized = normalize(users, [user]);
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const getEventUsers = createAsyncThunk(
	"users/getEventUsers",
	async (_, { getState, rejectWithValue }) => {
		try {
			const eventId = getState().events.globalId;
			const users = await UserService.getEventUsers(eventId);
			const normalized = normalize(users, [user]);
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const setEventUserRole = createAsyncThunk(
	"users/setEventUserRole",
	async ({ eventId, userId, role, roles }, { dispatch }) => {
		// Support both single role (legacy) and multiple roles
		const rolesToSet = roles || role;
		await UserService.setEventUserRole(eventId, userId, rolesToSet);
		dispatch(getEventUsers());
	},
);

const userSlice = createSlice({
	name: "users",
	initialState,
	reducers: {
		setUserId(state, action) {
			state.userId = action.payload
				? Number.parseInt(action.payload, 10)
				: null;
		},
		clearUsers(state) {
			state.users = {};
			state.userIds = [];
			state.eventUsers = [];
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getUsers.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getUsers.fulfilled, (state, action) => {
				state.users = action.payload.entities.users;
				state.userIds = action.payload.result;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getUsers.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(createUser.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(createUser.fulfilled, (state, action) => {
				state.users[action.payload.user_id] = action.payload;
				state.userIds.push(action.payload.user_id);
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(createUser.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(updateUser.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(updateUser.fulfilled, (state, action) => {
				state.users[action.payload.user_id] = action.payload;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateUser.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(deleteUser.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(deleteUser.fulfilled, (state, action) => {
				const userId = action.payload;
				const { [userId]: removed, ...remaining } = state.users;
				state.users = remaining;
				state.userIds = state.userIds.filter((id) => id !== userId);
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(deleteUser.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(syncUsers.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(syncUsers.fulfilled, (state, action) => {
				state.users = action.payload.entities.users;
				state.userIds = action.payload.result;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(syncUsers.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			})
			.addCase(getEventUsers.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getEventUsers.fulfilled, (state, action) => {
				state.users = action.payload.entities.users;
				state.userIds = action.payload.result;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getEventUsers.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload || action.error?.message || "An error occurred";
			});
	},
});

export const { setUserId, clearUsers } = userSlice.actions;
export default userSlice.reducer;
