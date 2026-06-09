import {
	DeleteOutlined,
	EditOutlined,
	LayoutOutlined,
	MoreOutlined,
	PlusOutlined,
	ReloadOutlined,
	UserSwitchOutlined,
} from "@ant-design/icons";
import { useAbstractColumns } from "@hooks/useAbstractColumns";
import { useTerminology } from "@hooks/useTerminology";
import StyledModal from "@shared/StyledModal";
import {
	deleteAbstract,
	exportAbstractPDF,
	getAbstracts,
	setAbstractId,
	updateAbstract,
} from "@state/abstractSlice";
import {
	fetchCustomFields,
	selectAbstractFields,
	toggleCustomFieldVisibility,
} from "@state/customFieldsSlice";
import {
	fetchColumnVisibility,
	saveColumnVisibility,
} from "@state/preferenceSlice";
import { getSettingByNameAndCategory } from "@state/settingSlice";
import { fetchStatuses, selectStatuses } from "@state/statusSlice";
import { getTracks } from "@state/trackSlice";
import { getEventUsers } from "@state/userSlice";
import { hasAddon } from "@utils/addons";
import { downloadBase64File } from "@utils/download";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Checkbox,
	Col,
	Drawer,
	Dropdown,
	Form,
	Input,
	Modal,
	Row,
	Select,
	Space,
	Spin,
	Table,
	Tag,
	Typography,
	theme,
} from "antd";
import PropTypes from "prop-types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { sprintf } from "sprintf-js";

// import TrackStatsCards from '../../frontend/tracks--delete/TrackStatsCards';

const { Search } = Input;
const { Option } = Select;

const Abstracts = () => {
	const { token } = theme.useToken();
	const [data, setData] = useState([]);
	const [customFieldColumns, setCustomFieldColumns] = useState([]);
	const [isColumnsOpen, setIsColumnsOpen] = useState(false);
	const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
	const [selectedAbstractForAssignment, setSelectedAbstractForAssignment] =
		useState(null);
	const [_uuid, _setUuid] = useState(null);
	// Status change modal state
	const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
	const [selectedAbstractForStatus, setSelectedAbstractForStatus] =
		useState(null);
	const [selectedStatus, setSelectedStatus] = useState(null);
	// Search and filter state
	const [searchText, setSearchText] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [trackFilter, setTrackFilter] = useState("all");
	// Bulk action state
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);
	// Column visibility state for fixed columns
	const [visibleFixedColumns, setVisibleFixedColumns] = useState({
		track: true,
		reviewers: true,
		submitted_by: true,
		status: true,
		created: true,
		modified: true,
	});
	const navigate = useNavigate();
	const dispatch = useDispatch();

	const { getTerm } = useTerminology();

	const { eventId, abstractId, abstractIds, abstracts, absIsLoading } =
		useSelector((state) => ({
			...state.abstracts,
			eventId: state.events.globalId,
			absIsLoading: state.abstracts.isLoading,
		}));

	const customFields = useSelector(selectAbstractFields);
	const tracks = useSelector((state) => state.tracks.tracks);
	const statuses = useSelector((state) =>
		selectStatuses(eventId, "abstract")(state),
	);
	const statusesLoading = useSelector((state) => state.statuses.isLoading);
	const { users, userIds } = useSelector((state) => ({
		users: state.users.users,
		userIds: state.users.userIds,
	}));
	const columnVisibility = useSelector(
		(state) => state.preferences.columnVisibility.abstracts,
	);
	const currentUser = useSelector((state) => state.auth?.user);
	const submitLimit = useSelector((state) =>
		getSettingByNameAndCategory(state, "abstract", "submit_limit", eventId),
	);

	// Reset and fetch data on event change
	useEffect(() => {
		if (eventId) {
			// Clear local state (Redux state cleared globally by changeGlobalEvent)
			setData([]);

			// Fetch new data for the selected event
			dispatch(getAbstracts(eventId));
			dispatch(fetchCustomFields({ event_id: eventId, usage: "abstract" }));
			dispatch(getTracks(eventId));
			dispatch(fetchStatuses({ eventId, type: "abstract" }));
			dispatch(getEventUsers(eventId));
			// Fetch column visibility preferences
			dispatch(fetchColumnVisibility({ eventId, context: "abstracts" }));
		}
	}, [dispatch, eventId]);

	// Sync column visibility from Redux to local state
	useEffect(() => {
		if (columnVisibility) {
			setVisibleFixedColumns(columnVisibility);

			// Also restore custom field visibility from user preferences if available
			if (columnVisibility.customFields && Array.isArray(customFields)) {
				const fieldColumns = customFields.map((field) => ({
					...field,
					visible:
						columnVisibility.customFields[field.field_id] !== false
							? Number.parseInt(field.show_in_admin, 10) !== 0
							: false,
				}));
				setCustomFieldColumns(fieldColumns);
			}
		}
	}, [columnVisibility, customFields]);

	// Initialize custom field columns with visibility (only when no user preferences exist)
	useEffect(() => {
		if (
			Array.isArray(customFields) &&
			(!columnVisibility || !columnVisibility.customFields)
		) {
			if (customFields.length > 0) {
				const fieldColumns = customFields.map((field) => ({
					...field,
					visible: Number.parseInt(field.show_in_admin, 10) !== 0, // Use database setting, default to true if undefined
				}));
				setCustomFieldColumns(fieldColumns);
			} else {
				// Clear columns when no custom fields exist for this event
				setCustomFieldColumns([]);
			}
		}
	}, [customFields, columnVisibility]);

	// Set data based on abstracts with new structure and custom field values
	useEffect(() => {
		if (!abstractIds.length) {
			return;
		}
		const _data = [];
		abstractIds.forEach((id) => {
			const abstract = abstracts[id];
			if (abstract) {
				const processedAbstract = {
					...abstract,
					key: id,
				};

				// Add custom field values to the abstract data
				if (abstract.custom_fields && abstract.custom_fields.length > 0) {
					abstract.custom_fields.forEach((fieldValue) => {
						const fieldDef = customFields.find(
							(f) => f.field_id === fieldValue.field_id,
						);
						if (fieldDef) {
							// Use field name as key for the column data
							processedAbstract[fieldDef.name] = fieldValue.value;
						}
					});
				}

				_data.push(processedAbstract);
			}
		});
		setData(_data);
	}, [abstracts, abstractIds, customFields]);

	// Wrap functions in useCallback to prevent dependency changes
	const launchCreate = useCallback(() => {
		// Check submission limit for non-admin users
		const isAdmin = currentUser?.capabilities?.manage_options;
		const maxSubmitLimit = submitLimit?.value
			? Number.parseInt(submitLimit.value, 10)
			: 0;

		if (!isAdmin && maxSubmitLimit > 0 && abstracts && currentUser?.user_id) {
			// Count user's abstracts for this event
			const userId = currentUser.user_id || currentUser.ID;
			const userAbstractCount = Object.values(abstracts).filter((abs) => {
				const abstractEventId = Number.parseInt(abs.event_id, 10);
				const abstractSubmitBy = Number.parseInt(abs.submit_by, 10);
				const currentUserId = Number.parseInt(userId, 10);
				return (
					abstractEventId === eventId && abstractSubmitBy === currentUserId
				);
			}).length;

			if (userAbstractCount >= maxSubmitLimit) {
				showError(
					sprintf(
						__(
							"You have reached the maximum submission limit of %d %s for this event.",
							"simplyconf",
						),
						maxSubmitLimit,
						getTerm("abstract", maxSubmitLimit),
					),
				);
				return;
			}
		}

		navigate("/abstracts/create");
	}, [navigate, currentUser, submitLimit, abstracts, eventId, getTerm]);

	const launchEdit = useCallback(
		(absId) => {
			navigate(`/abstracts/edit/${absId}`);
		},
		[navigate],
	);

	const launchView = useCallback(
		(absId) => {
			navigate(`/abstracts/view/${absId}`);
		},
		[navigate],
	);

	const launchReviews = useCallback(
		(absId) => {
			if (!hasAddon("reviews")) {
				Modal.warning({
					title: __("Reviews Add-on Required", "simplyconf"),
					content: (
						<div>
							<p>
								{__("This feature requires the", "simplyconf")}{" "}
								<strong>{__("Reviews Add-on", "simplyconf")}</strong>.
							</p>
							<p>
								{__(
									"Please install and activate the Reviews Add-on to assign reviewers and manage reviews.",
									"simplyconf",
								)}
							</p>
							<a
								href="https://simplyconf.com/addons/reviews"
								target="_blank"
								rel="noopener noreferrer"
							>
								{__("Get Reviews Add-on", "simplyconf")}
							</a>
						</div>
					),
				});
				return;
			}
			dispatch(setAbstractId(absId));
			navigate(`/reviews?absId=${absId}`);
		},
		[dispatch, navigate],
	);

	const launchAssignment = useCallback(
		(absId) => {
			if (!hasAddon("reviews")) {
				Modal.warning({
					title: __("Reviews Add-on Required", "simplyconf"),
					content: (
						<div>
							<p>
								{__("This feature requires the", "simplyconf")}{" "}
								<strong>{__("Reviews Add-on", "simplyconf")}</strong>.
							</p>
							<p>
								{__(
									"Please install and activate the Reviews Add-on to assign reviewers and manage reviews.",
									"simplyconf",
								)}
							</p>
							<a
								href="https://simplyconf.com/addons/reviews"
								target="_blank"
								rel="noopener noreferrer"
							>
								{__("Get Reviews Add-on", "simplyconf")}
							</a>
						</div>
					),
				});
				return;
			}
			const abstract = abstracts[absId];
			setSelectedAbstractForAssignment({
				id: absId,
				title: abstract?.title || `Abstract ${absId}`,
			});
			setIsAssignmentModalOpen(true);
		},
		[abstracts],
	);

	const closeDrawer = useCallback(() => {
		// Kept for backward compatibility if needed
	}, []);

	// Export PDF handler
	const handleExportPDF = useCallback(
		async (absId) => {
			if (!hasAddon("exports")) {
				Modal.warning({
					title: __("Exports Add-on Required", "simplyconf"),
					content: (
						<div>
							<p>
								{__(
									"The Exports add-on is required to export abstracts to PDF.",
									"simplyconf",
								)}
							</p>
							<a
								href="https://simplyconf.com/addons/exports"
								target="_blank"
								rel="noopener noreferrer"
							>
								{__("Get Exports Add-on", "simplyconf")}
							</a>
						</div>
					),
				});
				return;
			}

			try {
				const result = await dispatch(exportAbstractPDF(absId)).unwrap();
				downloadBase64File(result.content, result.filename);
				showSuccess(__("PDF exported successfully", "simplyconf"));
			} catch (error) {
				console.error("Error exporting PDF:", error);
				showError(__("Failed to export PDF", "simplyconf"));
			}
		},
		[dispatch],
	);

	// Refresh handler
	const handleRefresh = useCallback(() => {
		if (eventId) {
			dispatch(getAbstracts(eventId));
		}
	}, [dispatch, eventId]);

	const onDelete = useCallback(
		async (absId) => {
			try {
				await dispatch(deleteAbstract({ absId })).unwrap();
				showSuccess(__("Abstract deleted successfully", "simplyconf"));
				closeDrawer();
			} catch (_err) {
				showError(__("Failed to delete abstract", "simplyconf"));
			}
		},
		[dispatch, closeDrawer],
	);

	// Status change handlers
	const launchStatusChange = useCallback((abstract) => {
		setSelectedAbstractForStatus(abstract);
		setSelectedStatus(abstract.status);
		setIsStatusModalOpen(true);
	}, []);

	const handleStatusChange = useCallback(async () => {
		if (!selectedAbstractForStatus || !selectedStatus) {
			showError(__("Please select a status", "simplyconf"));
			return;
		}

		try {
			await dispatch(
				updateAbstract({
					absId: selectedAbstractForStatus.abstract_id,
					payload: { status: selectedStatus },
				}),
			).unwrap();
			showSuccess(__("Status updated successfully", "simplyconf"));
			setIsStatusModalOpen(false);
			setSelectedAbstractForStatus(null);
			setSelectedStatus(null);
		} catch (error) {
			console.error("Error updating status:", error);
			showError(__("Failed to update status", "simplyconf"));
		}
	}, [selectedAbstractForStatus, selectedStatus, dispatch]);

	// Function to toggle column visibility
	const handleToggleColumn = useCallback(
		(field) => {
			// Update local state immediately
			const updatedColumns = customFieldColumns.map((col) =>
				col.field_id === field.field_id
					? { ...col, visible: !col.visible }
					: col,
			);
			setCustomFieldColumns(updatedColumns);

			// Save custom field visibility to user preferences for persistence
			const customFieldVisibility = {};
			updatedColumns.forEach((col) => {
				customFieldVisibility[col.field_id] = col.visible;
			});

			dispatch(
				saveColumnVisibility({
					eventId,
					context: "abstracts",
					visibility: {
						...visibleFixedColumns,
						customFields: customFieldVisibility,
					},
				}),
			);

			// Persist visibility change to database
			if (field?.field_id) {
				const newVisibility =
					Number.parseInt(field.show_in_admin, 10) === 0 ? 1 : 0;
				dispatch(
					toggleCustomFieldVisibility({
						field_id: field.field_id,
						show_in_admin: newVisibility,
						event_id: eventId,
						usage: "abstract",
					}),
				);
			}
		},
		[dispatch, eventId, customFieldColumns, visibleFixedColumns],
	);

	// Function to toggle fixed column visibility
	const handleToggleFixedColumn = useCallback(
		async (columnKey) => {
			const updated = {
				...visibleFixedColumns,
				[columnKey]: !visibleFixedColumns[columnKey],
			};
			setVisibleFixedColumns(updated);
			await dispatch(
				saveColumnVisibility({
					eventId,
					context: "abstracts",
					visibility: updated,
				}),
			);
		},
		[visibleFixedColumns, dispatch, eventId],
	);

	// Bulk delete handler
	const handleBulkDelete = async () => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: __("Delete Abstracts", "simplyconf"),
			content: __(
				"Are you sure you want to delete {selectedRowKeys.length} selected abstracts? This action cannot be undone.",
				"simplyconf",
			).replace("{selectedRowKeys.length}", selectedRowKeys.length),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					// Use service directly to avoid multiple getAbstracts calls
					const AbstractsService = (await import("@services/abstracts"))
						.default;
					await Promise.all(
						selectedRowKeys.map((id) => AbstractsService.delete(id)),
					);

					// Fetch abstracts once after all deletes complete
					await dispatch(getAbstracts(eventId));

					showSuccess(
						`${selectedRowKeys.length} ${__("abstracts deleted successfully", "simplyconf")}`,
					);
					setSelectedRowKeys([]);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showError(
						__(
							"Some abstracts could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	// Bulk status change handler
	const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
	const [bulkStatus, setBulkStatus] = useState(null);

	const handleBulkStatusChange = () => {
		if (selectedRowKeys.length === 0) {
			showWarning(__("Please select at least one abstract", "simplyconf"));
			return;
		}
		setIsBulkStatusModalOpen(true);
	};

	const handleBulkStatusUpdate = async () => {
		if (!bulkStatus) {
			showError(__("Please select a status", "simplyconf"));
			return;
		}

		try {
			// Use service directly to avoid multiple getAbstracts calls
			const AbstractsService = (await import("@services/abstracts")).default;
			await Promise.all(
				selectedRowKeys.map((id) =>
					AbstractsService.update(id, { status: bulkStatus }),
				),
			);

			// Fetch abstracts once after all updates complete
			await dispatch(getAbstracts(eventId));

			showSuccess(
				__(
					"Status updated for {selectedRowKeys.length} abstracts successfully",
					"simplyconf",
				).replace("{selectedRowKeys.length}", selectedRowKeys.length),
			);
			setIsBulkStatusModalOpen(false);
			setBulkStatus(null);
			setSelectedRowKeys([]);
		} catch (error) {
			console.error("Bulk status update failed:", error);
			showError(__("Failed to update status for some abstracts", "simplyconf"));
		}
	};

	// Bulk assign reviewers handler
	const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

	const handleBulkAssignReviewers = () => {
		if (selectedRowKeys.length === 0) {
			showWarning(__("Please select at least one abstract", "simplyconf"));
			return;
		}

		const ReviewerAssignmentModal =
			window.simplyconf?.components?.reviews?.ReviewerAssignmentModal;

		if (!ReviewerAssignmentModal) {
			showError(
				__(
					"The Reviews service is not available. Please ensure the Reviews addon is activated and properly loaded.",
					"simplyconf",
				),
			);
			return;
		}

		setIsBulkAssignModalOpen(true);
	};

	const handleBulkAssignComplete = useCallback(async () => {
		// Modal handles the assignment in bulkMode
		// This callback is just to refresh data after assignment completes
		await dispatch(getAbstracts(eventId));
	}, [dispatch, eventId]);

	const handleSingleAssignmentChange = useCallback(() => {
		// Refresh data after single assignment change
		dispatch(getAbstracts(eventId));
	}, [dispatch, eventId]);

	// Memoize abstractIds for bulk assignment to prevent infinite loop
	const bulkAbstractIds = useMemo(() => {
		return selectedRowKeys.map((id) => Number.parseInt(id, 10));
	}, [selectedRowKeys]);

	// Memoized filtered data based on search and filters
	const filteredData = useMemo(() => {
		return data.filter((abstract) => {
			// Text search (title and description)
			const searchMatch =
				searchText === "" ||
				abstract.title?.toLowerCase().includes(searchText.toLowerCase()) ||
				abstract.description?.toLowerCase().includes(searchText.toLowerCase());

			// Status filter
			const statusMatch =
				statusFilter === "all" ||
				abstract.status?.toString() === statusFilter.toString();

			// Track filter
			const trackMatch =
				trackFilter === "all" ||
				abstract.track_id?.toString() === trackFilter.toString();

			return searchMatch && statusMatch && trackMatch;
		});
	}, [data, searchText, statusFilter, trackFilter]);

	// Generate dynamic table columns based on custom fields
	const tableColumns = useAbstractColumns({
		customFieldColumns,
		visibleFixedColumns,
		tracks,
		statuses,
		statusesLoading,
		launchView,
		launchEdit,
		launchReviews,
		launchAssignment,
		launchStatusChange,
		handleExportPDF,
		onDelete,
	});

	const columnsMemo = tableColumns;
	const dataMemo = filteredData;

	// Row selection configuration
	const rowSelection = {
		selectedRowKeys,
		onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
		getCheckboxProps: (_record) => ({
			// Optionally disable selection for certain records
			disabled: false,
		}),
	};

	return (
		<React.Fragment>
			<div className="simplyconf-page-stats">
				{/* <TrackStatsCards
					submissions={data}
					statuses={statuses}
					userTracks={tracks} // All tracks in admin view
				/> */}
			</div>
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Space>
							<Typography.Title level={3} style={{ margin: 0, color: "#fff" }}>
								{getTerm("abstract", 2)}
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
								({filteredData.length} of {data.length})
							</Typography.Text>
						</Space>
					</Col>
					<Col>
						<Space>
							{selectedRowKeys.length > 0 && (
								<Dropdown
									menu={{
										items: [
											{
												key: "bulk_status",
												label: __("Change Status", "simplyconf"),
												icon: <ReloadOutlined />,
												onClick: handleBulkStatusChange,
											},
											{
												key: "bulk_assign",
												label: __("Assign Reviewers", "simplyconf"),
												icon: <UserSwitchOutlined />,
												onClick: handleBulkAssignReviewers,
											},
											{
												key: "bulk_delete",
												label: __("Delete Selected", "simplyconf"),
												icon: <DeleteOutlined />,
												danger: true,
												onClick: handleBulkDelete,
											},
										],
									}}
									placement="bottomRight"
								>
									<Button className="simplyconf-bulk-actions-btn">
										{__(
											"Bulk Actions ({selectedRowKeys.length})",
											"simplyconf",
										).replace(
											"{selectedRowKeys.length}",
											selectedRowKeys.length,
										)}{" "}
										<MoreOutlined />
									</Button>
								</Dropdown>
							)}
							<Search
								data-testid="abstract-search-input"
								placeholder={__(
									"Search {getTerm('abstract', 2).toLowerCase()}...",
									"simplyconf",
								).replace(
									"{getTerm('abstract', 2).toLowerCase()}",
									getTerm("abstract", 2).toLowerCase(),
								)}
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								className="simplyconf-admin-search"
								allowClear
							/>

							<Select
								value={statusFilter}
								onChange={(value) => setStatusFilter(value)}
								style={{ width: 150 }}
								placeholder={__("Filter by status", "simplyconf")}
								data-testid="status-filter"
							>
								<Option value="all">{__("All Statuses", "simplyconf")}</Option>
								{statuses.map((status) => (
									<Option key={status.status_id} value={status.status_id}>
										{status.label}
									</Option>
								))}
							</Select>

							<Select
								value={trackFilter}
								onChange={(value) => setTrackFilter(value)}
								style={{ width: 150 }}
								placeholder={__("Filter by track", "simplyconf")}
								data-testid="track-filter"
							>
								<Option value="all">{__("All Tracks", "simplyconf")}</Option>
								{tracks.map((track) => (
									<Option key={track.track_id} value={track.track_id}>
										{track.name}
									</Option>
								))}
							</Select>

							<Button
								type="text"
								icon={<ReloadOutlined />}
								onClick={handleRefresh}
								className="simplyconf-secondary-action-btn"
								title={__("Refresh", "simplyconf")}
								data-testid="refresh-btn"
							/>

							<Button
								data-testid="manage-columns-btn"
								type="text"
								icon={<LayoutOutlined />}
								onClick={() => setIsColumnsOpen(true)}
								size="middle"
								className="simplyconf-secondary-action-btn"
							/>

							<Button
								type="primary"
								size="middle"
								onClick={launchCreate}
								icon={<PlusOutlined />}
								className="simplyconf-main-action-btn"
								data-testid="create-abstract-btn"
							>
								{__("Create", "simplyconf")}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>
			{absIsLoading ? (
				<Spin tip={__("Loading...", "simplyconf")}>
					<div data-testid="abstracts-table">
						<Table
							id="custom-container"
							dataSource={dataMemo}
							columns={columnsMemo}
							rowSelection={rowSelection}
							onRow={(record) => ({
								"data-testid": `abstract-row-${record.abstract_id}`,
							})}
							scroll={{ x: "max-content" }}
							showSorterTooltip={{
								title: "Click to sort",
							}}
							pagination={getTablePagination({
								total: filteredData.length,
								entityName: __("abstracts", "simplyconf"),
							})}
							style={{
								background: "#fff",
								borderRadius: "8px",
								overflow: "hidden",
								boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
							}}
						/>
					</div>
				</Spin>
			) : (
				<div data-testid="abstracts-table">
					<Table
						id="custom-container"
						dataSource={dataMemo}
						columns={columnsMemo}
						rowSelection={rowSelection}
						onRow={(record) => ({
							"data-testid": `abstract-row-${record.abstract_id}`,
						})}
						scroll={{ x: "max-content" }}
						showSorterTooltip={{
							title: "Click to sort",
						}}
						pagination={getTablePagination({
							total: filteredData.length,
							entityName: getTerm("abstract", 2).toLowerCase(),
						})}
						style={{
							background: "#fff",
							borderRadius: "8px",
							overflow: "hidden",
							boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
						}}
						rowClassName={(_record, index) =>
							index % 2 === 0 ? "table-row-light" : "table-row-dark"
						}
					/>
				</div>
			)}
			{/* Column Visibility Modal */}
			<StyledModal
				data-testid="abstracts-columns-modal"
				title={__("Manage Columns", "simplyconf")}
				titleIcon={<LayoutOutlined />}
				open={isColumnsOpen}
				onCancel={() => setIsColumnsOpen(false)}
				footer={null}
				width={650}
			>
				<div style={{ padding: "8px 0" }}>
					<Typography.Text type="secondary" style={{ fontSize: "13px" }}>
						{__(
							"Customize which columns are visible in your table view",
							"simplyconf",
						)}
					</Typography.Text>
				</div>

				<Space
					direction="vertical"
					style={{ width: "100%", marginTop: "16px" }}
					size="middle"
				>
					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
							marginBottom: "16px",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							🔒 {__("Core Identity Columns (Always Visible)", "simplyconf")}
						</Typography.Title>
						<Typography.Text
							type="secondary"
							style={{
								fontSize: "12px",
								marginBottom: "12px",
								display: "block",
							}}
						>
							{__("These columns help you identify abstracts", "simplyconf")}
						</Typography.Text>
						<div style={{ marginTop: "12px" }}>
							<Tag color="blue" style={{ margin: "2px" }}>
								{__("ID", "simplyconf")}
							</Tag>
							<Tag color="blue" style={{ margin: "2px" }}>
								{__("Title", "simplyconf")}
							</Tag>
							<Tag color="blue" style={{ margin: "2px" }}>
								{__("Action", "simplyconf")}
							</Tag>
						</div>
					</div>

					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
							marginBottom: "16px",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							📌 {__("Optional Fixed Columns", "simplyconf")}
						</Typography.Title>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2, 1fr)",
								gap: "10px",
							}}
						>
							<Checkbox
								checked={visibleFixedColumns.track}
								onChange={() => handleToggleFixedColumn("track")}
								style={{ padding: "4px 0" }}
							>
								{getTerm("track", 1)}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.reviewers}
								onChange={() => handleToggleFixedColumn("reviewers")}
								style={{ padding: "4px 0" }}
							>
								{getTerm("reviewer", 2)}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.submitted_by}
								onChange={() => handleToggleFixedColumn("submitted_by")}
								style={{ padding: "4px 0" }}
							>
								{__("Submitted By", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.status}
								onChange={() => handleToggleFixedColumn("status")}
								style={{ padding: "4px 0" }}
							>
								{__("Status", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.created}
								onChange={() => handleToggleFixedColumn("created")}
								style={{ padding: "4px 0" }}
							>
								{__("Created", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.modified}
								onChange={() => handleToggleFixedColumn("modified")}
								style={{ padding: "4px 0" }}
							>
								{__("Modified", "simplyconf")}
							</Checkbox>
						</div>
					</div>

					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							⚙️ Custom Fields
						</Typography.Title>
						{customFieldColumns.length > 0 ? (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, 1fr)",
									gap: "10px",
								}}
							>
								{customFieldColumns.map((field) => (
									<Checkbox
										key={field.field_id}
										checked={field.visible}
										onChange={() => handleToggleColumn(field)}
										style={{ padding: "4px 0" }}
									>
										{field.label}
									</Checkbox>
								))}
							</div>
						) : (
							<div
								style={{
									textAlign: "center",
									padding: "20px",
									background: "#fff",
									borderRadius: "6px",
									border: "1px dashed #d9d9d9",
								}}
							>
								<Typography.Text type="secondary" style={{ fontSize: "13px" }}>
									{__(
										"No custom fields have been created for this event",
										"simplyconf",
									)}
								</Typography.Text>
							</div>
						)}
					</div>
				</Space>
			</StyledModal>{" "}
			{/* Status Change Modal */}
			<StyledModal
				data-testid="abstracts-status-modal"
				title={`Change ${getTerm("abstract", 1)} Status`}
				titleIcon={<EditOutlined />}
				open={isStatusModalOpen}
				onCancel={() => {
					setIsStatusModalOpen(false);
					setSelectedAbstractForStatus(null);
					setSelectedStatus(null);
				}}
				onOk={handleStatusChange}
				okText={__("Change Status", "simplyconf")}
				width={500}
			>
				{selectedAbstractForStatus && (
					<div>
						<Typography.Paragraph strong>
							Abstract: {selectedAbstractForStatus.title}
						</Typography.Paragraph>
						<Form layout="vertical">
							<Form.Item label={__("Select Status", "simplyconf")} required>
								<Select
									value={selectedStatus}
									onChange={setSelectedStatus}
									placeholder={__("Select a status", "simplyconf")}
									style={{ width: "100%" }}
								>
									{statuses?.map((status) => (
										<Option key={status.status_id} value={status.status_id}>
											{status.label || status.name}
										</Option>
									))}
								</Select>
							</Form.Item>
						</Form>
					</div>
				)}
			</StyledModal>
			{/* Bulk Status Change Modal */}
			<StyledModal
				data-testid="abstracts-bulk-status-modal"
				title={`Change Status for ${selectedRowKeys.length} ${getTerm("abstract", 2)}`}
				titleIcon={<EditOutlined />}
				open={isBulkStatusModalOpen}
				onCancel={() => {
					setIsBulkStatusModalOpen(false);
					setBulkStatus(null);
				}}
				onOk={handleBulkStatusUpdate}
				okText={__("Update Status", "simplyconf")}
				cancelText={__("Cancel", "simplyconf")}
				width={500}
			>
				<div>
					<Typography.Paragraph>
						You are about to change the status for {selectedRowKeys.length}{" "}
						selected {getTerm("abstract", 2).toLowerCase()}.
					</Typography.Paragraph>
					<Form layout="vertical">
						<Form.Item label={__("Select Status", "simplyconf")} required>
							<Select
								value={bulkStatus}
								onChange={setBulkStatus}
								placeholder={__("Select a status", "simplyconf")}
								style={{ width: "100%" }}
							>
								{statuses?.map((status) => (
									<Option key={status.status_id} value={status.status_id}>
										{status.label || status.name}
									</Option>
								))}
							</Select>
						</Form.Item>
					</Form>
				</div>
			</StyledModal>
			{/* Bulk Reviewer Assignment Modal */}
			{isBulkAssignModalOpen &&
				(() => {
					const ReviewerAssignmentModal =
						window.simplyconf?.components?.reviews?.ReviewerAssignmentModal;

					if (!ReviewerAssignmentModal) {
						return null;
					}

					return (
						<ReviewerAssignmentModal
							visible={isBulkAssignModalOpen}
							onClose={() => {
								setIsBulkAssignModalOpen(false);
								setSelectedRowKeys([]);
							}}
							abstractId={bulkAbstractIds}
							abstractTitle={sprintf(
								__("Bulk Assignment (%d %s)", "simplyconf"),
								selectedRowKeys.length,
								getTerm("abstract", 2),
							)}
							onAssignmentChange={handleBulkAssignComplete}
							bulkMode={true}
						/>
					);
				})()}
			{/* Reviewer Assignment Modal - Dynamically loaded from addon */}
			{selectedAbstractForAssignment &&
				(() => {
					const ReviewerAssignmentModal =
						window.simplyconf?.components?.reviews?.ReviewerAssignmentModal;

					if (!ReviewerAssignmentModal) {
						return null;
					}

					return (
						<ReviewerAssignmentModal
							visible={isAssignmentModalOpen}
							onClose={() => {
								setIsAssignmentModalOpen(false);
								setSelectedAbstractForAssignment(null);
							}}
							abstractId={Number.parseInt(selectedAbstractForAssignment.id, 10)}
							abstractTitle={selectedAbstractForAssignment.title}
							onAssignmentChange={handleSingleAssignmentChange}
						/>
					);
				})()}
		</React.Fragment>
	);
};

const AbstractDrawer = ({ title, open, onClose, uuid, children }) => (
	<Drawer
		title={title}
		width={900}
		onClose={onClose}
		open={open}
		zIndex={2}
		styles={{
			body: { paddingBottom: 80 },
			content: { paddingTop: 50 },
		}}
	>
		{React.cloneElement(children, { key: uuid })}
	</Drawer>
);

AbstractDrawer.propTypes = {
	title: PropTypes.string.isRequired,
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	uuid: PropTypes.string,
	children: PropTypes.element.isRequired,
	footer: PropTypes.node,
};

export default Abstracts;
