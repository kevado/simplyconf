import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import DashboardService from "@services/dashboard";
import { __ } from "@wordpress/i18n";

// Async thunks
export const fetchDashboardStats = createAsyncThunk(
	"dashboard/fetchStats",
	async (eventId, { rejectWithValue }) => {
		try {
			return await DashboardService.getStats(eventId);
		} catch (error) {
			return rejectWithValue(
				error.response?.data?.message || error.message || "An error occurred",
			);
		}
	},
);

export const fetchDashboardActivity = createAsyncThunk(
	"dashboard/fetchActivity",
	async ({ eventId, limit = 20 }, { rejectWithValue }) => {
		try {
			const data = await DashboardService.getActivity(eventId, limit);
			// Transform API response to component format
			const transformedActivity = (data.activities || []).map((item) => {
				let actionText;

				switch (item.type) {
					case "abstract":
						actionText =
							item.action === "updated"
								? __("updated an abstract", "simplyconf")
								: __("submitted an abstract", "simplyconf");
						break;
					case "review":
						actionText =
							item.action === "updated"
								? __("updated a review", "simplyconf")
								: __("submitted a review", "simplyconf");
						break;
					case "registration":
						actionText = __("registered for the event", "simplyconf");
						break;
					case "email":
						actionText = __("sent an email", "simplyconf");
						break;
					case "attachment":
						actionText = __("uploaded a file", "simplyconf");
						break;
					default:
						actionText = __("performed an action", "simplyconf");
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
				error.response?.data?.message || error.message || "An error occurred",
			);
		}
	},
);

const dashboardSlice = createSlice({
	name: "dashboard",
	initialState: {
		stats: {
			abstracts: {
				total: 0,
				drafts: 0,
				attachments: 0,
			},
			users: {
				total: 0,
				authors: 0,
				reviewers: 0,
			},
			reviews: {
				addon_active: false,
				total: 0,
				pending: 0,
				days_remaining: null,
			},
			emails: {
				addon_active: false,
				sent: 0,
				failed: 0,
				total_triggers: 0,
			},
			payments: {
				addon_active: false,
			},
			schedules: {
				addon_active: false,
			},
		},
		activity: [],
		isLoading: false,
		activityLoading: false,
		hasError: false,
		errorMessage: "",
	},
	reducers: {
		clearError: (state) => {
			state.hasError = false;
			state.errorMessage = "";
		},
		resetStats: (state) => {
			state.stats = {
				abstracts: {
					total: 0,
					drafts: 0,
					attachments: 0,
				},
				users: {
					total: 0,
					authors: 0,
					reviewers: 0,
				},
				reviews: {
					addon_active: false,
				},
				emails: {
					addon_active: false,
				},
				payments: {
					addon_active: false,
				},
				schedules: {
					addon_active: false,
				},
			};
			state.activity = [];
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch dashboard stats
			.addCase(fetchDashboardStats.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchDashboardStats.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				state.stats = action.payload;
			})
			.addCase(fetchDashboardStats.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to load dashboard stats";
			})
			// Fetch dashboard activity
			.addCase(fetchDashboardActivity.pending, (state) => {
				state.activityLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchDashboardActivity.fulfilled, (state, action) => {
				state.activityLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				state.activity = action.payload;
			})
			.addCase(fetchDashboardActivity.rejected, (state, action) => {
				state.activityLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to load recent activity";
			});
	},
});

export const { clearError, resetStats } = dashboardSlice.actions;

// Selectors (Admin dashboard only)
export const selectDashboardStats = (state) => state.dashboard.stats;
export const selectDashboardLoading = (state) => state.dashboard.isLoading;
export const selectDashboardActivity = (state) => state.dashboard.activity;
export const selectDashboardActivityLoading = (state) =>
	state.dashboard.activityLoading;
export const selectDashboardError = (state) => state.dashboard.hasError;
export const selectDashboardErrorMessage = (state) =>
	state.dashboard.errorMessage;

export default dashboardSlice.reducer;
