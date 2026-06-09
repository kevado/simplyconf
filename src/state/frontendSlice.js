import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import FrontendService from "@services/frontend";
import { __ } from "@wordpress/i18n";

export const getProfile = createAsyncThunk("frontend/getProfile", async () => {
	return await FrontendService.getProfile();
});

export const updateProfile = createAsyncThunk(
	"frontend/updateProfile",
	async (data, { dispatch }) => {
		await FrontendService.updateProfile(data);
		dispatch(getProfile());
	},
);

export const getMySubmissions = createAsyncThunk(
	"frontend/getMySubmissions",
	async (event_id) => {
		return await FrontendService.getMySubmissions(event_id);
	},
);

export const getTrackSubmissions = createAsyncThunk(
	"frontend/getTrackSubmissions",
	async (event_id) => {
		return await FrontendService.getTrackSubmissions(event_id);
	},
);

// Frontend dashboard async thunks
export const fetchMyStats = createAsyncThunk(
	"frontend/fetchMyStats",
	async (eventId, { rejectWithValue }) => {
		try {
			return await FrontendService.getMyStats(eventId);
		} catch (error) {
			return rejectWithValue(
				error.response?.data || { message: error.message },
			);
		}
	},
);

export const fetchActionItems = createAsyncThunk(
	"frontend/fetchActionItems",
	async (eventId, { rejectWithValue }) => {
		try {
			return await FrontendService.getActionItems(eventId);
		} catch (error) {
			return rejectWithValue(
				error.response?.data || { message: error.message },
			);
		}
	},
);

export const fetchDashboardActivity = createAsyncThunk(
	"frontend/fetchDashboardActivity",
	async ({ eventId, limit = 20 }, { rejectWithValue }) => {
		try {
			const data = await FrontendService.getActivity(eventId, limit);
			// Transform API response to component format
			const transformedActivity = (data.activities || []).map((item) => {
				let actionText;

				switch (item.type) {
					case "abstract":
						actionText =
							item.action === "updated"
								? __("Updated an Abstract", "simplyconf")
								: __("Submitted an Abstract", "simplyconf");
						break;
					case "review":
						actionText =
							item.action === "updated"
								? __("Updated a Review", "simplyconf")
								: __("Submitted a Review", "simplyconf");
						break;
					case "registration":
						actionText = __("Registered for the Event", "simplyconf");
						break;
					case "email":
						actionText = __("Sent an Email", "simplyconf");
						break;
					case "attachment":
						actionText = __("Uploaded a File", "simplyconf");
						break;
					default:
						actionText = __("Performed an Action", "simplyconf");
				}

				return {
					id: `${item.type}-${item.entity_id}`,
					type: item.type,
					user: item.user || __("System", "simplyconf"),
					action: actionText,
					time: new Date(item.date).toLocaleString(),
					entity_id: item.entity_id,
					event_id: item.event_id,
				};
			});
			return transformedActivity;
		} catch (error) {
			return rejectWithValue(
				error.response?.data || { message: error.message },
			);
		}
	},
);

const frontendSlice = createSlice({
	name: "frontend",
	initialState: {
		profile: null,
		submissions: [],
		reviews: [],
		assignments: [],
		trackSubmissions: [],
		profileLoading: false,
		submissionsLoading: false,
		reviewsLoading: false,
		assignmentsLoading: false,
		trackSubmissionsLoading: false,
		// Dashboard state
		dashboardStats: {
			submissions: {
				total: 0,
				accepted: 0,
				pending: 0,
				rejected: 0,
				draft: 0,
			},
			reviews: {
				assigned: 0,
				completed: 0,
				pending: 0,
				overdue: 0,
			},
			track: {
				submissions: 0,
				assigned: 0,
				unassigned: 0,
			},
		},
		actionItems: [],
		activity: [],
		dashboardStatsLoading: false,
		actionItemsLoading: false,
		activityLoading: false,
		hasError: false,
		errorMessage: "",
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(getProfile.pending, (state) => {
				state.profileLoading = true;
			})
			.addCase(getProfile.fulfilled, (state, action) => {
				state.profile = action.payload;
				state.profileLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getProfile.rejected, (state, action) => {
				state.profileLoading = false;
				state.hasError = true;
				state.errorMessage = action.error.message;
			})
			.addCase(getMySubmissions.pending, (state) => {
				state.submissionsLoading = true;
			})
			.addCase(getMySubmissions.fulfilled, (state, action) => {
				state.submissions = action.payload;
				state.submissionsLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getMySubmissions.rejected, (state, action) => {
				state.submissionsLoading = false;
				state.hasError = true;
				state.errorMessage = action.error.message;
			})
			.addCase(getTrackSubmissions.pending, (state) => {
				state.trackSubmissionsLoading = true;
			})
			.addCase(getTrackSubmissions.fulfilled, (state, action) => {
				state.trackSubmissions = action.payload;
				state.trackSubmissionsLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(getTrackSubmissions.rejected, (state, action) => {
				state.trackSubmissionsLoading = false;
				state.hasError = true;
				state.errorMessage = action.error.message;
			})
			// Dashboard stats
			.addCase(fetchMyStats.pending, (state) => {
				state.dashboardStatsLoading = true;
			})
			.addCase(fetchMyStats.fulfilled, (state, action) => {
				state.dashboardStats = action.payload;
				state.dashboardStatsLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchMyStats.rejected, (state, action) => {
				state.dashboardStatsLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload?.message ||
					action.error.message ||
					"Failed to load your statistics";
			})
			// Action items
			.addCase(fetchActionItems.pending, (state) => {
				state.actionItemsLoading = true;
			})
			.addCase(fetchActionItems.fulfilled, (state, action) => {
				state.actionItems = action.payload.items || [];
				state.actionItemsLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchActionItems.rejected, (state, action) => {
				state.actionItemsLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload?.message ||
					action.error.message ||
					"Failed to load action items";
			})
			// Dashboard activity
			.addCase(fetchDashboardActivity.pending, (state) => {
				state.activityLoading = true;
			})
			.addCase(fetchDashboardActivity.fulfilled, (state, action) => {
				state.activity = action.payload;
				state.activityLoading = false;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchDashboardActivity.rejected, (state, action) => {
				state.activityLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload?.message ||
					action.error.message ||
					"Failed to load recent activity";
			});
	},
});

// Selectors
export const selectProfile = (state) => state.frontend.profile;
export const selectSubmissions = (state) => state.frontend.submissions;
export const selectTrackSubmissions = (state) =>
	state.frontend.trackSubmissions;

// Dashboard selectors
export const selectDashboardStats = (state) => state.frontend.dashboardStats;
export const selectDashboardStatsLoading = (state) =>
	state.frontend.dashboardStatsLoading;
export const selectActionItems = (state) => state.frontend.actionItems;
export const selectActionItemsLoading = (state) =>
	state.frontend.actionItemsLoading;
export const selectActivity = (state) => state.frontend.activity;
export const selectActivityLoading = (state) => state.frontend.activityLoading;

export default frontendSlice.reducer;
