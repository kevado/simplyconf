import {
	createAsyncThunk,
	createSelector,
	createSlice,
} from "@reduxjs/toolkit";
import AttachmentService from "@services/attachments";

// Async thunks for attachment operations
export const fetchAttachments = createAsyncThunk(
	"attachments/fetchAttachments",
	async (
		{ entityType, entityId, eventId, filters = {} },
		{ rejectWithValue },
	) => {
		try {
			const params = {};

			if (entityType) params.entity_type = entityType;
			if (entityId) params.entity_id = entityId;
			if (eventId) params.event_id = eventId;

			// Add additional filters
			Object.entries(filters).forEach(([key, value]) => {
				if (value && value !== "all") {
					params[key] = value;
				}
			});

			const data = await AttachmentService.queryAttachments(params);
			return data;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const uploadAttachment = createAsyncThunk(
	"attachments/uploadAttachment",
	async (
		{ file, entityType, entityId, eventId, metadata = {} },
		{ rejectWithValue },
	) => {
		try {
			const response = await AttachmentService.uploadFile(
				file,
				entityType,
				entityId,
				eventId,
				metadata,
			);
			return response;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const deleteAttachment = createAsyncThunk(
	"attachments/deleteAttachment",
	async (attachmentId, { rejectWithValue }) => {
		try {
			await AttachmentService.deleteAttachment(attachmentId);
			return attachmentId;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const bulkDeleteAttachments = createAsyncThunk(
	"attachments/bulkDeleteAttachments",
	async (attachmentIds, { rejectWithValue }) => {
		try {
			await Promise.all(
				attachmentIds.map((id) => AttachmentService.deleteAttachment(id)),
			);
			return attachmentIds;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const updateAttachment = createAsyncThunk(
	"attachments/updateAttachment",
	async ({ attachmentId, updates }, { rejectWithValue }) => {
		try {
			const response = await AttachmentService.updateAttachment(
				attachmentId,
				updates,
			);
			return response;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const downloadAttachment = createAsyncThunk(
	"attachments/downloadAttachment",
	async (attachmentId, { rejectWithValue }) => {
		try {
			const response = await AttachmentService.downloadFile(attachmentId);
			return { attachmentId, response };
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

// Initial state
const initialState = {
	attachments: [],
	attachmentById: {},
	isLoading: false,
	hasError: false,
	errorMessage: "",
	uploadProgress: {},
	filters: {
		searchText: "",
		fileType: "all",
		purpose: "all",
		accessLevel: "all",
		entityType: "all",
	},
	selectedAttachmentIds: [],
	pagination: {
		current: 1,
		pageSize: 20,
		total: 0,
	},
	sortBy: {
		field: "created",
		order: "desc",
	},
};

// Attachment slice
const attachmentSlice = createSlice({
	name: "attachments",
	initialState,
	reducers: {
		// Filter actions
		setSearchText: (state, action) => {
			state.filters.searchText = action.payload;
		},
		setFileTypeFilter: (state, action) => {
			state.filters.fileType = action.payload;
		},
		setPurposeFilter: (state, action) => {
			state.filters.purpose = action.payload;
		},
		setAccessLevelFilter: (state, action) => {
			state.filters.accessLevel = action.payload;
		},
		setEntityTypeFilter: (state, action) => {
			state.filters.entityType = action.payload;
		},
		clearFilters: (state) => {
			state.filters = initialState.filters;
		},

		// Selection actions
		setSelectedAttachments: (state, action) => {
			state.selectedAttachmentIds = action.payload;
		},
		selectAttachment: (state, action) => {
			if (!state.selectedAttachmentIds.includes(action.payload)) {
				state.selectedAttachmentIds.push(action.payload);
			}
		},
		deselectAttachment: (state, action) => {
			state.selectedAttachmentIds = state.selectedAttachmentIds.filter(
				(id) => id !== action.payload,
			);
		},
		clearSelection: (state) => {
			state.selectedAttachmentIds = [];
		},

		// Pagination actions
		setPagination: (state, action) => {
			state.pagination = { ...state.pagination, ...action.payload };
		},

		// Sorting actions
		setSortBy: (state, action) => {
			state.sortBy = action.payload;
		},

		// Upload progress
		setUploadProgress: (state, action) => {
			const { fileId, progress } = action.payload;
			state.uploadProgress[fileId] = progress;
		},
		clearUploadProgress: (state, action) => {
			const fileId = action.payload;
			delete state.uploadProgress[fileId];
		},

		// Clear error
		clearError: (state) => {
			state.hasError = false;
			state.errorMessage = "";
		},

		// Increment download count
		incrementDownloadCount: (state, action) => {
			const attachmentId = action.payload;
			const attachment = state.attachmentById[attachmentId];
			if (attachment) {
				attachment.download_count = (attachment.download_count || 0) + 1;
			}
			// Also update in attachments array
			const index = state.attachments.findIndex(
				(a) => a.attachment_id === attachmentId,
			);
			if (index !== -1) {
				state.attachments[index].download_count =
					(state.attachments[index].download_count || 0) + 1;
			}
		},
	},
	extraReducers: (builder) => {
		// Fetch attachments
		builder
			.addCase(fetchAttachments.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(fetchAttachments.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				const newAttachments = action.payload || [];

				// Check if this is a filtered fetch or a full fetch
				const isFilteredFetch =
					newAttachments.length > 0 &&
					newAttachments.every(
						(a) =>
							a.entity_type === newAttachments[0]?.entity_type &&
							a.entity_id === newAttachments[0]?.entity_id,
					);

				if (isFilteredFetch && newAttachments.length > 0) {
					// Remove existing attachments for this specific entity to avoid duplicates
					const entityType = newAttachments[0].entity_type;
					const entityId = newAttachments[0].entity_id;

					state.attachments = state.attachments.filter(
						(a) => !(a.entity_type === entityType && a.entity_id === entityId),
					);

					// Add new attachments
					state.attachments.push(...newAttachments);
				} else {
					// Full fetch or mixed entities - replace all attachments
					state.attachments = newAttachments;
				}

				// Rebuild lookup object
				state.attachmentById = {};
				state.attachments.forEach((attachment) => {
					state.attachmentById[attachment.attachment_id] = attachment;
				});
				state.pagination.total = state.attachments.length;
			})
			.addCase(fetchAttachments.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to fetch attachments";
			}); // Upload attachment
		builder
			.addCase(uploadAttachment.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(uploadAttachment.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				const newAttachment = action.payload;
				state.attachments.unshift(newAttachment);
				state.attachmentById[newAttachment.attachment_id] = newAttachment;
				state.pagination.total += 1;
			})
			.addCase(uploadAttachment.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to upload attachment";
			});

		// Delete attachment
		builder
			.addCase(deleteAttachment.pending, (state) => {
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(deleteAttachment.fulfilled, (state, action) => {
				const attachmentId = action.payload;
				state.attachments = state.attachments.filter(
					(a) => a.attachment_id !== attachmentId,
				);
				delete state.attachmentById[attachmentId];
				state.selectedAttachmentIds = state.selectedAttachmentIds.filter(
					(id) => id !== attachmentId,
				);
				state.pagination.total -= 1;
			})
			.addCase(deleteAttachment.rejected, (state, action) => {
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to delete attachment";
			});

		// Bulk delete attachments
		builder
			.addCase(bulkDeleteAttachments.pending, (state) => {
				state.isLoading = true;
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(bulkDeleteAttachments.fulfilled, (state, action) => {
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = "";
				const deletedIds = action.payload;
				state.attachments = state.attachments.filter(
					(a) => !deletedIds.includes(a.attachment_id),
				);
				deletedIds.forEach((id) => {
					delete state.attachmentById[id];
				});
				state.selectedAttachmentIds = [];
				state.pagination.total -= deletedIds.length;
			})
			.addCase(bulkDeleteAttachments.rejected, (state, action) => {
				state.isLoading = false;
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to delete attachments";
			});

		// Update attachment
		builder
			.addCase(updateAttachment.pending, (state) => {
				state.hasError = false;
				state.errorMessage = "";
			})
			.addCase(updateAttachment.fulfilled, (state, action) => {
				const updatedAttachment = action.payload;
				const index = state.attachments.findIndex(
					(a) => a.attachment_id === updatedAttachment.attachment_id,
				);
				if (index !== -1) {
					state.attachments[index] = updatedAttachment;
				}
				state.attachmentById[updatedAttachment.attachment_id] =
					updatedAttachment;
			})
			.addCase(updateAttachment.rejected, (state, action) => {
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to update attachment";
			});

		// Download attachment
		builder
			.addCase(downloadAttachment.fulfilled, (_state) => {
				// Download count is incremented on the backend
				// No need to update state here - it will be refreshed on next fetch
			})
			.addCase(downloadAttachment.rejected, (state, action) => {
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					"Failed to download attachment";
			});
	},
});

// Export actions
export const {
	setSearchText,
	setFileTypeFilter,
	setPurposeFilter,
	setAccessLevelFilter,
	setEntityTypeFilter,
	clearFilters,
	setSelectedAttachments,
	selectAttachment,
	deselectAttachment,
	clearSelection,
	setPagination,
	setSortBy,
	setUploadProgress,
	clearUploadProgress,
	clearError,
	incrementDownloadCount,
} = attachmentSlice.actions;

// Selectors
export const selectAttachments = (state) => state.attachments.attachments;
export const selectAttachmentById = (state, attachmentId) =>
	state.attachments.attachmentById[attachmentId];
export const selectAttachmentsLoading = (state) => state.attachments.isLoading;
export const selectAttachmentsError = (state) => state.attachments.hasError;
export const selectAttachmentsErrorMessage = (state) =>
	state.attachments.errorMessage;
export const selectAttachmentFilters = (state) => state.attachments.filters;
export const selectSelectedAttachmentIds = (state) =>
	state.attachments.selectedAttachmentIds;
export const selectAttachmentPagination = (state) =>
	state.attachments.pagination;
export const selectAttachmentSortBy = (state) => state.attachments.sortBy;
export const selectUploadProgress = (state) => state.attachments.uploadProgress;

// Filtered attachments selector (memoized to prevent infinite re-render loops)
export const selectFilteredAttachments = createSelector(
	[selectAttachments, selectAttachmentFilters],
	(attachments, filters) => {
		return attachments.filter((attachment) => {
			const matchesSearch =
				filters.searchText === "" ||
				attachment.file_name
					.toLowerCase()
					.includes(filters.searchText.toLowerCase()) ||
				attachment.entity_type
					.toLowerCase()
					.includes(filters.searchText.toLowerCase());

			const matchesFileType =
				filters.fileType === "all" ||
				attachment.file_category === filters.fileType ||
				attachment.file_type.includes(filters.fileType);

			const matchesPurpose =
				filters.purpose === "all" ||
				attachment.file_purpose === filters.purpose;

			const matchesAccessLevel =
				filters.accessLevel === "all" ||
				attachment.access_level === filters.accessLevel;

			const matchesEntityType =
				filters.entityType === "all" ||
				attachment.entity_type === filters.entityType;

			return (
				matchesSearch &&
				matchesFileType &&
				matchesPurpose &&
				matchesAccessLevel &&
				matchesEntityType
			);
		});
	},
);

export default attachmentSlice.reducer;
