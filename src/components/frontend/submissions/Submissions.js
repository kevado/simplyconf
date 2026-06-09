import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	DeleteOutlined,
	DownOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	EyeOutlined,
	LayoutOutlined,
	PlusOutlined,
	ReloadOutlined,
	SearchOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import CustomFieldFileValue from "@shared/customFields/CustomFieldFileValue";
import StyledModal from "@shared/StyledModal";
import { deleteAbstract } from "@state/abstractSlice";
import {
	fetchCustomFields,
	selectCustomFieldsByUsage,
	selectIsLoading as selectCustomFieldsLoading,
} from "@state/customFieldsSlice";
import { getMySubmissions } from "@state/frontendSlice";
import {
	fetchColumnVisibility,
	saveColumnVisibility,
} from "@state/preferenceSlice";
import { getSettings } from "@state/settingSlice";
import { fetchStatuses, selectStatuses } from "@state/statusSlice";
import { getTracks } from "@state/trackSlice";
import { showError, showSuccess } from "@utils/feedback";
import { getFrontendTableConfig, getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Checkbox,
	Col,
	Dropdown,
	Input,
	Menu,
	Modal,
	Popover,
	Row,
	Select,
	Space,
	Spin,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { debounce } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { sprintf } from "sprintf-js";

const { Search } = Input;
const { Option } = Select;

const Submissions = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { submissions, submissionsLoading, hasError, errorMessage } =
		useSelector((state) => state.frontend);

	const { getTerm } = useTerminology();

	const event_id = window.simplyconf?.eventId || 1;

	const currentEvent = useSelector((state) => state.events.events[event_id]);
	const isEventArchived =
		currentEvent?.status === 0 || currentEvent?.status === "0";

	const customFields = useSelector((state) =>
		selectCustomFieldsByUsage(state, "abstract"),
	);
	const customFieldsLoading = useSelector((state) =>
		selectCustomFieldsLoading(state, "abstract"),
	);

	// Add status selectors
	const statuses = useSelector((state) =>
		selectStatuses(event_id, "abstract")(state),
	);
	const statusesLoading = useSelector((state) => state.statuses.isLoading);

	const tracks = useSelector((state) => state.tracks.tracks || []);
	const tracksLoading = useSelector((state) => state.tracks.isLoading);

	// Get settings state for submission limit check
	const abstractSettings = useSelector(
		(state) => state.settings?.settings?.abstract || [],
	);

	// Column visibility preferences
	const columnVisibility = useSelector(
		(state) => state.preferences.columnVisibility.submissions,
	);

	// Local state for search and filtering
	const [searchText, setSearchText] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [trackFilter, setTrackFilter] = useState("all");
	const [filteredData, setFilteredData] = useState([]);
	const [customFieldColumns, setCustomFieldColumns] = useState([]);
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);
	const [isColumnsOpen, setIsColumnsOpen] = useState(false);
	const [visibleFixedColumns, setVisibleFixedColumns] = useState({
		status: true,
		created: true,
	});

	// Debounced search handler
	const debouncedSetSearchText = useCallback(
		debounce((value) => {
			setSearchText(value);
		}, 300),
		[],
	);

	// Refresh handler
	const handleRefresh = useCallback(() => {
		dispatch(getMySubmissions(event_id));
		dispatch(fetchCustomFields({ event_id, usage: "abstract" }));
		dispatch(fetchStatuses({ eventId: event_id, type: "abstract" }));
		dispatch(getTracks(event_id));
	}, [dispatch, event_id]);

	useEffect(() => {
		dispatch(getMySubmissions(event_id));
		dispatch(fetchCustomFields({ event_id, usage: "abstract" }));
		dispatch(fetchStatuses({ eventId: event_id, type: "abstract" }));
		dispatch(getTracks(event_id));
		dispatch(getSettings(event_id));
		dispatch(
			fetchColumnVisibility({ eventId: event_id, context: "submissions" }),
		);
	}, [dispatch, event_id]);

	// Sync column visibility from saved preferences
	useEffect(() => {
		if (columnVisibility) {
			if (
				columnVisibility.status !== undefined ||
				columnVisibility.created !== undefined
			) {
				setVisibleFixedColumns({
					status: columnVisibility.status !== false,
					created: columnVisibility.created !== false,
				});
			}
			if (columnVisibility.customFields && Array.isArray(customFields)) {
				const fieldColumns = customFields
					.filter((field) => {
						const showInFrontend =
							field.show_in_frontend === undefined ||
							field.show_in_frontend === 1 ||
							field.show_in_frontend === true ||
							field.show_in_frontend === "1";
						return showInFrontend;
					})
					.map((field) => ({
						...field,
						visible: columnVisibility.customFields[field.field_id] === true,
					}));
				setCustomFieldColumns(fieldColumns);
			}
		}
	}, [columnVisibility, customFields]);

	// Initialize custom field columns (only when no saved preferences exist)
	useEffect(() => {
		if (
			Array.isArray(customFields) &&
			(!columnVisibility || !columnVisibility.customFields)
		) {
			const fieldColumns = customFields
				.filter((field) => {
					const showInFrontend =
						field.show_in_frontend === undefined ||
						field.show_in_frontend === 1 ||
						field.show_in_frontend === true ||
						field.show_in_frontend === "1";
					return showInFrontend;
				})
				.map((field) => ({
					...field,
					visible: false, // Hidden by default on frontend
				}));
			setCustomFieldColumns(fieldColumns);
		}
	}, [customFields, columnVisibility]);

	// Filter data based on search and status
	useEffect(() => {
		if (!submissions || submissions.length === 0) {
			setFilteredData([]);
			return;
		}

		const filtered = submissions.filter((item) => {
			// Text search - title, abstract text, author names
			const searchLower = searchText.toLowerCase();
			const searchMatch =
				!searchText ||
				item.title?.toLowerCase().includes(searchLower) ||
				item.description?.toLowerCase().includes(searchLower) ||
				item.abstract_id?.toString().includes(searchText) ||
				item.status?.toLowerCase().includes(searchLower) ||
				(item.authors &&
					Array.isArray(item.authors) &&
					item.authors.some(
						(author) =>
							`${author.first_name} ${author.last_name}`
								.toLowerCase()
								.includes(searchLower) ||
							author.email?.toLowerCase().includes(searchLower),
					));

			// Status filter
			const statusMatch =
				statusFilter === "all" ||
				Number.parseInt(item.status, 10) === Number.parseInt(statusFilter, 10);

			// Track filter
			const trackMatch =
				trackFilter === "all" ||
				Number.parseInt(item.track_id, 10) === Number.parseInt(trackFilter, 10);

			return searchMatch && statusMatch && trackMatch;
		});

		const processedFiltered = filtered.map((submission) => ({
			...submission,
			key: submission.abstract_id,
			custom_fields: submission.custom_fields || [],
		}));

		setFilteredData(processedFiltered);
	}, [searchText, statusFilter, trackFilter, submissions]);

	const handleDelete = async (abstract_id, title) => {
		Modal.confirm({
			title: `${__("Delete", "simplyconf")} ${getTerm("abstract", 1)}`,
			icon: <ExclamationCircleOutlined />,
			content: `${__("Are you sure you want to delete", "simplyconf")} "${title}"? ${__("This action cannot be undone.", "simplyconf")}`,
			okText: __("Yes, Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					await dispatch(deleteAbstract({ absId: abstract_id }));
					dispatch(getMySubmissions(event_id));
					showSuccess(
						__("Success", "simplyconf"),
						__("The submission has been successfully deleted.", "simplyconf"),
					);
				} catch (error) {
					console.error("Failed to delete abstract:", error);
					showError(
						__("Error", "simplyconf"),
						__(
							"Failed to delete the submission. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	// Bulk delete handler
	const handleBulkDelete = useCallback(() => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: __("Delete Submissions", "simplyconf"),
			content: __(
				"Are you sure you want to delete {count} selected submissions? This action cannot be undone.",
				"simplyconf",
			).replace("{count}", selectedRowKeys.length),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					await Promise.all(
						selectedRowKeys.map((id) =>
							dispatch(deleteAbstract({ absId: id })),
						),
					);
					await dispatch(getMySubmissions(event_id));
					showSuccess(
						__(
							"{count} submissions deleted successfully",
							"simplyconf",
						).replace("{count}", selectedRowKeys.length),
					);
					setSelectedRowKeys([]);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showError(
						__(
							"Some submissions could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	}, [selectedRowKeys, dispatch, event_id]);

	// Row selection configuration
	const rowSelection = {
		type: "checkbox",
		selectedRowKeys,
		onChange: (selectedRowKeys) => {
			setSelectedRowKeys(selectedRowKeys);
		},
		getCheckboxProps: (record) => ({
			name: record.title,
		}),
	};

	// Bulk actions menu
	const bulkActionsMenu = (
		<Menu>
			<Menu.Item key="delete" danger onClick={handleBulkDelete}>
				{__("Delete Selected", "simplyconf")}
			</Menu.Item>
		</Menu>
	);

	// Toggle custom field column visibility
	const handleToggleColumn = useCallback(
		(field) => {
			const updatedColumns = customFieldColumns.map((col) =>
				col.field_id === field.field_id
					? { ...col, visible: !col.visible }
					: col,
			);
			setCustomFieldColumns(updatedColumns);

			const customFieldVisibility = {};
			updatedColumns.forEach((col) => {
				customFieldVisibility[col.field_id] = col.visible;
			});

			dispatch(
				saveColumnVisibility({
					eventId: event_id,
					context: "submissions",
					visibility: {
						...visibleFixedColumns,
						customFields: customFieldVisibility,
					},
				}),
			);
		},
		[dispatch, event_id, customFieldColumns, visibleFixedColumns],
	);

	// Toggle fixed column visibility
	const handleToggleFixedColumn = useCallback(
		(columnKey) => {
			const updated = {
				...visibleFixedColumns,
				[columnKey]: !visibleFixedColumns[columnKey],
			};
			setVisibleFixedColumns(updated);

			const customFieldVisibility = {};
			customFieldColumns.forEach((col) => {
				customFieldVisibility[col.field_id] = col.visible;
			});

			dispatch(
				saveColumnVisibility({
					eventId: event_id,
					context: "submissions",
					visibility: {
						...updated,
						customFields: customFieldVisibility,
					},
				}),
			);
		},
		[dispatch, event_id, visibleFixedColumns, customFieldColumns],
	);

	// Map colors to appropriate Ant Design colors
	const getTagColor = (color) => {
		if (!color) return "default";

		// Handle hex colors
		if (color.startsWith("#")) {
			switch (color.toLowerCase()) {
				case "#dc3545":
				case "#ff4d4f":
					return "red";
				case "#28a745":
				case "#52c41a":
					return "green";
				case "#ffc107":
				case "#faad14":
					return "orange";
				case "#17a2b8":
				case "#1890ff":
					return "blue";
				case "#6c757d":
					return "default";
				default:
					return "blue";
			}
		}

		// Handle named colors
		switch (color.toLowerCase()) {
			case "red":
			case "danger":
				return "red";
			case "green":
			case "success":
				return "green";
			case "yellow":
			case "warning":
				return "orange";
			case "blue":
			case "primary":
				return "blue";
			case "gray":
			case "grey":
			case "secondary":
				return "default";
			default:
				return "blue";
		}
	};

	// Get appropriate icon based on status name
	const getStatusIcon = (name) => {
		const lowerName = name.toLowerCase();
		if (lowerName.includes("draft")) return <EditOutlined />;
		if (lowerName.includes("submit") || lowerName.includes("review"))
			return <ClockCircleOutlined />;
		if (lowerName.includes("accept") || lowerName.includes("approve"))
			return <CheckCircleOutlined />;
		if (lowerName.includes("reject") || lowerName.includes("decline"))
			return <ExclamationCircleOutlined />;
		if (lowerName.includes("revision") || lowerName.includes("revise"))
			return <SyncOutlined />;
		return <ClockCircleOutlined />;
	};

	// Status rendering with dynamic statuses
	const getStatusTag = (status, record) => {
		// If we have status data directly in the record (from backend join), use it
		if (record?.status_name) {
			const statusObj = {
				name: record.status_name,
				label: record.status_label || record.status_name,
				color: record.status_color || "blue",
			};

			const tagColor = getTagColor(statusObj.color);
			const icon = getStatusIcon(statusObj.name);

			return (
				<Tag
					icon={icon}
					color={tagColor}
					style={{
						fontWeight: "500",
						borderRadius: "6px",
						padding: "4px 8px",
						fontSize: "12px",
					}}
				>
					{statusObj.label}
				</Tag>
			);
		}

		// Fallback to Redux store lookup for cases where direct data isn't available
		// Show loading state if statuses are still loading
		if (statusesLoading) {
			return (
				<Tag icon={<ClockCircleOutlined />} color="default">
					{__("Loading...", "simplyconf")}
				</Tag>
			);
		}

		// Handle case where statuses aren't loaded yet
		if (!statuses || !Array.isArray(statuses) || statuses.length === 0) {
			return (
				<Tag icon={<ExclamationCircleOutlined />} color="default">
					{__("Unknown", "simplyconf")}
				</Tag>
			);
		}

		// Find the dynamic status by ID
		const statusObj = statuses.find(
			(s) => Number.parseInt(s.status_id, 10) === Number.parseInt(status, 10),
		);

		if (!statusObj) {
			return (
				<Tag icon={<ExclamationCircleOutlined />} color="default">
					{__("Unknown (ID: {status})", "simplyconf").replace(
						"{status}",
						status,
					)}
				</Tag>
			);
		}

		const tagColor = getTagColor(statusObj.color);
		const icon = getStatusIcon(statusObj.name);

		return (
			<Tag
				icon={icon}
				color={tagColor}
				style={{
					fontWeight: "500",
					borderRadius: "6px",
					padding: "4px 8px",
					fontSize: "12px",
				}}
			>
				{statusObj.label || statusObj.name}
			</Tag>
		);
	};

	// Create action panel for each row
	const getActionPanel = (record) => {
		const actions = [];

		actions.push(
			<Button
				key="view"
				size="small"
				icon={<EyeOutlined />}
				onClick={() => navigate(`/submissions/view/${record.abstract_id}`)}
				style={{ marginBottom: 4, marginRight: 4 }}
			>
				{__("View", "simplyconf")}
			</Button>,
		);
		actions.push(
			<Button
				key="edit"
				size="small"
				icon={<EditOutlined />}
				onClick={() => navigate(`/submissions/edit/${record.abstract_id}`)}
				style={{ marginBottom: 4, marginRight: 4 }}
			>
				{__("Edit", "simplyconf")}
			</Button>,
		);
		actions.push(
			<Button
				key="delete"
				size="small"
				danger
				icon={<DeleteOutlined />}
				onClick={() => handleDelete(record.abstract_id, record.title)}
				style={{ marginBottom: 4 }}
			>
				{__("Delete", "simplyconf")}
			</Button>,
		);

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				{actions}
			</div>
		);
	};

	// State for row hover and popover (removed row-level popover)

	// Create simplified columns for the table
	const getTableColumns = () => {
		const columns = [
			{
				title: __("ID", "simplyconf"),
				dataIndex: "abstract_id",
				key: "abstract_id",
				width: 80,
				render: (id) => (
					<Typography.Text style={{ fontWeight: "500" }}>{id}</Typography.Text>
				),
			},
			{
				title: __("Title", "simplyconf"),
				dataIndex: "title",
				key: "title",
				render: (text, record) => (
					<Popover
						content={getActionPanel(record)}
						title={__("Actions", "simplyconf")}
						trigger="hover"
						placement="right"
						overlayStyle={{ zIndex: 1050 }}
					>
						<Typography.Text
							ellipsis
							className="simplyconf-table-link"
							style={{ maxWidth: 250 }}
						>
							{text || __("Untitled", "simplyconf")}
						</Typography.Text>
					</Popover>
				),
			},
		];

		// Add visible custom field columns
		customFieldColumns.forEach((field) => {
			if (!field.visible) return;
			columns.push({
				title: field.label || field.name,
				key: `custom_field_${field.field_id}`,
				dataIndex: `custom_field_${field.field_id}`,
				width: 150,
				render: (_value, record) => {
					const customField = record.custom_fields?.find(
						(cf) => cf.field_id === field.field_id,
					);

					if (!customField || !customField.value) {
						return <Typography.Text type="secondary">-</Typography.Text>;
					}

					if (field.type === "file_upload") {
						return <CustomFieldFileValue value={customField.value} />;
					}

					let displayValue = customField.value;

					if (Array.isArray(displayValue)) {
						displayValue = displayValue.join(", ");
					}

					if (typeof displayValue === "boolean") {
						displayValue = displayValue
							? __("Yes", "simplyconf")
							: __("No", "simplyconf");
					}

					return (
						<Tooltip title={displayValue}>
							<Typography.Text
								ellipsis
								style={{ maxWidth: 120, fontSize: "13px" }}
							>
								{displayValue}
							</Typography.Text>
						</Tooltip>
					);
				},
			});
		});

		// Add status column if visible
		if (visibleFixedColumns.status) {
			columns.push({
				title: __("Status", "simplyconf"),
				dataIndex: "status",
				key: "status",
				width: 140,
				render: (status, record) => getStatusTag(status, record),
			});
		}

		// Add created date column if visible
		if (visibleFixedColumns.created) {
			columns.push({
				title: __("Created", "simplyconf"),
				dataIndex: "created",
				key: "created",
				width: 120,
				render: (date) => {
					if (!date) return "-";
					try {
						return new Date(date).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						});
					} catch (_error) {
						return date;
					}
				},
			});
		}

		return columns;
	};

	if (
		submissionsLoading ||
		customFieldsLoading ||
		statusesLoading ||
		tracksLoading
	) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16 }}>
					{__("Loading Submissions...", "simplyconf")}
				</div>
			</div>
		);
	}

	if (hasError) {
		return (
			<Card>
				<Typography.Text type="danger">{errorMessage}</Typography.Text>
			</Card>
		);
	}

	return (
		<React.Fragment>
			<div className="simplyconf-page-header">
				<Row justify="space-between" align="middle">
					<Col>
						<Space>
							<Typography.Title
								level={3}
								style={{
									color: "#fff",
									margin: 0,
									fontWeight: "600",
									textShadow: "0 2px 4px rgba(0,0,0,0.1)",
								}}
							>
								My {getTerm("abstract", 2)}
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
								({filteredData.length} of {submissions?.length || 0})
							</Typography.Text>
						</Space>
					</Col>
					<Col>
						<Space>
							<Input
								placeholder={__("Search {abstracts}...", "simplyconf").replace(
									"{abstracts}",
									getTerm("abstract", 2).toLowerCase(),
								)}
								onChange={(e) => debouncedSetSearchText(e.target.value)}
								style={{ width: 300 }}
								allowClear
								prefix={<SearchOutlined />}
							/>

							<Button
								icon={<ReloadOutlined />}
								onClick={handleRefresh}
								style={{
									background: "rgba(255, 255, 255, 0.15)",
									borderColor: "rgba(255, 255, 255, 0.25)",
									color: "#fff",
								}}
								title={__("Refresh", "simplyconf")}
							/>

							<Button
								icon={<LayoutOutlined />}
								onClick={() => setIsColumnsOpen(true)}
								style={{
									background: "rgba(255, 255, 255, 0.15)",
									borderColor: "rgba(255, 255, 255, 0.25)",
									color: "#fff",
								}}
								title={__("Manage Columns", "simplyconf")}
							/>

							<Select
								value={statusFilter}
								onChange={(value) => setStatusFilter(value)}
								style={{ width: 150 }}
								placeholder={__("Filter by status", "simplyconf")}
								loading={statusesLoading}
							>
								<Option value="all">{__("All Status", "simplyconf")}</Option>
								{statuses &&
									Array.isArray(statuses) &&
									statuses.map((status) => (
										<Option key={status.status_id} value={status.status_id}>
											{status.label || status.name}
										</Option>
									))}
							</Select>

							<Select
								value={trackFilter}
								onChange={setTrackFilter}
								style={{ width: 150 }}
								placeholder={__("Filter by track", "simplyconf")}
								loading={tracksLoading}
								allowClear
							>
								<Option value="all">{__("All Tracks", "simplyconf")}</Option>
								{tracks &&
									Array.isArray(tracks) &&
									tracks.map((track) => (
										<Option key={track.track_id} value={track.track_id}>
											{track.name}
										</Option>
									))}
							</Select>

							<Tooltip
								title={
									isEventArchived
										? __("Submissions are closed for this event.", "simplyconf")
										: null
								}
							>
								<Button
									type="primary"
									icon={<PlusOutlined />}
									disabled={isEventArchived}
									onClick={() => {
										// Find submit_limit setting from abstractSettings
										const submitLimitSetting = abstractSettings.find(
											(s) =>
												s.name === "submit_limit" &&
												Number.parseInt(s.event_id, 10) ===
													Number.parseInt(event_id, 10),
										);

										const maxSubmitLimit = submitLimitSetting?.value
											? Number.parseInt(submitLimitSetting.value, 10)
											: 0;
										const userSubmissionCount = submissions
											? submissions.length
											: 0;

										if (
											maxSubmitLimit > 0 &&
											userSubmissionCount >= maxSubmitLimit
										) {
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

										navigate("/submissions/create");
									}}
									data-testid="new-submission-btn"
								>
									New {getTerm("abstract", 1)}
								</Button>
							</Tooltip>
						</Space>
					</Col>
				</Row>
			</div>

			<div className="simplyconf-page-body">
				{/* Bulk Actions Section */}
				{selectedRowKeys.length > 0 && (
					<div
						style={{
							marginBottom: "16px",
							padding: "12px 16px",
							background: "#f6ffed",
							border: "1px solid #b7eb8f",
							borderRadius: "6px",
						}}
					>
						<Space>
							<span style={{ fontWeight: "bold" }}>
								{selectedRowKeys.length} {__("item(s) selected", "simplyconf")}
							</span>
							<Dropdown overlay={bulkActionsMenu} trigger={["click"]}>
								<Button>
									{__("Bulk Actions", "simplyconf")} <DownOutlined />
								</Button>
							</Dropdown>
							<Button size="small" onClick={() => setSelectedRowKeys([])}>
								{__("Clear Selection", "simplyconf")}
							</Button>
						</Space>
					</div>
				)}
				<Table
					dataSource={filteredData}
					columns={getTableColumns()}
					rowKey="abstract_id"
					rowSelection={rowSelection}
					pagination={getTablePagination({
						total: filteredData.length,
						entityName: getTerm("abstract", 2).toLowerCase(),
					})}
					{...getFrontendTableConfig()}
				/>
			</div>
			{/* Column Visibility Modal */}
			<StyledModal
				data-testid="submissions-columns-modal"
				title={__("Manage Columns", "simplyconf")}
				titleIcon={<LayoutOutlined />}
				open={isColumnsOpen}
				onCancel={() => setIsColumnsOpen(false)}
				footer={null}
				width={500}
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
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							{__("Columns", "simplyconf")}
						</Typography.Title>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2, 1fr)",
								gap: "10px",
							}}
						>
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
						</div>
					</div>

					{customFieldColumns.length > 0 && (
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
								{__("Custom Fields", "simplyconf")}
							</Typography.Title>
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
										{field.label || field.name}
									</Checkbox>
								))}
							</div>
						</div>
					)}
				</Space>
			</StyledModal>
		</React.Fragment>
	);
};

export default Submissions;
