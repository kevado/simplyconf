import {
	AppstoreOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CopyOutlined,
	DeleteOutlined,
	EditOutlined,
	EnvironmentOutlined,
	EyeOutlined,
	FileTextOutlined,
	InboxOutlined,
	MoreOutlined,
	PlusOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import StyledModal from "@shared/StyledModal";
import {
	deleteEvent,
	getEvents,
	setEventId,
	updateEventStatus,
} from "@state/eventSlice";
import { showError, showSuccess } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Col,
	Dropdown,
	Input,
	Modal,
	Popconfirm,
	Row,
	Select,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
	theme,
} from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CreateEvent from "./CreateEvent";
import EditEvent from "./EditEvent";

const { Search } = Input;
const { Option } = Select;

const Events = () => {
	const { token } = theme.useToken();
	const dispatch = useDispatch();
	const { getTerm } = useTerminology();
	const { events, eventIds, isLoading } = useSelector((state) => state.events);

	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isViewing, setIsViewing] = useState(false);
	const [data, setData] = useState([]);
	const [event, setEvent] = useState(null);
	const [archiveLoading, setArchiveLoading] = useState(false);

	// Search and filter state
	const [searchText, setSearchText] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	// Bulk action state
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);

	// Memoized filtered data
	const filteredData = useMemo(() => {
		let filtered = data;

		// Text search filter
		if (searchText) {
			filtered = filtered.filter(
				(event) =>
					event.name?.toLowerCase().includes(searchText.toLowerCase()) ||
					event.description?.toLowerCase().includes(searchText.toLowerCase()),
			);
		}

		// Status filter
		if (statusFilter !== "all") {
			if (statusFilter === "active") {
				filtered = filtered.filter(
					(event) => event.status === 1 || event.status === "1",
				);
			} else if (statusFilter === "archived") {
				filtered = filtered.filter(
					(event) => event.status === 0 || event.status === "0",
				);
			}
		}

		return filtered;
	}, [data, searchText, statusFilter]);

	// Clear all filters
	const _clearFilters = () => {
		setSearchText("");
		setStatusFilter("all");
	};

	// Function to copy shortcode to clipboard
	const copyShortcode = (eventId) => {
		const shortcode = `[simplyconf event_id=${eventId}]`;

		if (!navigator.clipboard) {
			// Fallback for browsers that don't support Clipboard API
			const textArea = document.createElement("textarea");
			textArea.value = shortcode;
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			try {
				const success = document.execCommand("copy");
				if (success) {
					showSuccess(__("Shortcode copied to clipboard!", "simplyconf"));
				} else {
					showError(__("Failed to copy shortcode", "simplyconf"));
				}
			} catch (err) {
				console.error("Failed to copy: ", err);
				showError(__("Failed to copy shortcode", "simplyconf"));
			}
			document.body.removeChild(textArea);
		} else {
			// Modern browsers with Clipboard API support
			navigator.clipboard.writeText(shortcode).then(
				() => {
					showSuccess(__("Shortcode copied to clipboard!", "simplyconf"));
				},
				(err) => {
					console.error("Failed to copy: ", err);
					showError(__("Failed to copy shortcode", "simplyconf"));
				},
			);
		}
	};

	// Bulk delete handler
	const handleBulkDelete = async () => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: __("Delete Events", "simplyconf"),
			content: __(
				"Are you sure you want to delete {selectedRowKeys.length} selected events? This action cannot be undone.",
				"simplyconf",
			).replace("{selectedRowKeys.length}", selectedRowKeys.length),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					await Promise.all(
						selectedRowKeys.map((id) => dispatch(deleteEvent(id)).unwrap()),
					);
					showSuccess(
						`${selectedRowKeys.length} ${__("events deleted successfully", "simplyconf")}`,
					);
					setSelectedRowKeys([]);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showError(
						__(
							"Some events could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	// Bulk archive handler
	const handleBulkArchive = async () => {
		if (selectedRowKeys.length === 0) return;

		try {
			setArchiveLoading(true);
			await Promise.all(
				selectedRowKeys.map((id) =>
					dispatch(
						updateEventStatus({ eventId: id, status: "archived" }),
					).unwrap(),
				),
			);
			showSuccess(
				`${selectedRowKeys.length} ${__("events archived successfully", "simplyconf")}`,
			);
			setSelectedRowKeys([]);
		} catch (error) {
			console.error("Bulk archive failed:", error);
			showError(
				__(
					"Some events could not be archived. Please try again.",
					"simplyconf",
				),
			);
		} finally {
			setArchiveLoading(false);
		}
	};

	const columns = [
		{
			title: __("ID", "simplyconf"),
			dataIndex: "event_id",
			key: "event_id",
		},
		{
			title: __("Event Name", "simplyconf"),
			dataIndex: "name",
			key: "event_name",
			render: (text, record) => (
				<Button
					type="link"
					onClick={() => launchView(record.event_id)}
					className="simplyconf-table-link"
				>
					{text}
				</Button>
			),
		},
		{
			title: __("Start Date", "simplyconf"),
			dataIndex: "start_date",
			key: "event_start_date",
			render: (date) => {
				if (!date) return "-";
				// Parse as local date (YYYY-MM-DD format from database)
				const [year, month, day] = date.split("-");
				return new Date(year, month - 1, day).toLocaleDateString();
			},
		},
		{
			title: __("End Date", "simplyconf"),
			dataIndex: "end_date",
			key: "event_end_date",
			render: (date) => {
				if (!date) return "-";
				// Parse as local date (YYYY-MM-DD format from database)
				const [year, month, day] = date.split("-");
				return new Date(year, month - 1, day).toLocaleDateString();
			},
		},
		{
			title: __("Deadline", "simplyconf"),
			dataIndex: "deadline",
			key: "event_deadline",
		},
		{
			title: __("Shortcode", "simplyconf"),
			key: "event_shortcode",
			render: (_text, record) => (
				<Tooltip title={__("Click to copy shortcode", "simplyconf")}>
					<Space
						style={{ cursor: "pointer" }}
						onClick={() => copyShortcode(record.event_id)}
					>
						<span>[simplyconf event_id={record.event_id}]</span>
						<CopyOutlined style={{ color: "#1890ff" }} />
					</Space>
				</Tooltip>
			),
		},
		{
			title: getTerm("submission", 2),
			dataIndex: "submission_count",
			key: "event_submissions",
			render: (count) => (
				<Tag color={count > 0 ? "blue" : "default"}>{count || 0}</Tag>
			),
		},
		{
			title: __("Status", "simplyconf"),
			dataIndex: "status",
			key: "event_status",
			render: (status) => {
				// Convert tinyint to string for display
				if (status === 0 || status === "0") {
					return <Tag color="orange">{__("Archived", "simplyconf")}</Tag>;
				}
				return <Tag color="green">{__("Active", "simplyconf")}</Tag>;
			},
		},
		{
			title: __("Actions", "simplyconf"),
			key: "event_actions",
			render: (_text, record) => (
				<Space
					size="middle"
					direction="vertical"
					id={`event-${record.event_id}-action`}
				>
					<Dropdown
						menu={{
							items: [
								{
									key: "0_view",
									label: __("View", "simplyconf"),
									icon: <EyeOutlined />,
									onClick: () => launchView(record.event_id),
								},
								{
									key: "1_edit",
									label: __("Edit", "simplyconf"),
									icon: <EditOutlined />,
									onClick: () => launchEdit(record.event_id),
								},
								{
									key: "2_archive",
									label:
										record.status === 0 || record.status === "0"
											? __("Unarchive", "simplyconf")
											: __("Archive", "simplyconf"),
									icon:
										record.status === 0 || record.status === "0" ? (
											<AppstoreOutlined />
										) : (
											<InboxOutlined />
										),
									onClick: () =>
										handleArchiveToggle(record.event_id, record.status),
								},
								{
									key: "3_delete",
									label: (
										<Popconfirm
											placement="topRight"
											title={__("Confirmation", "simplyconf")}
											description={__(
												"Are you sure you want to delete this event? This action cannot be undone.",
												"simplyconf",
											)}
											okText={__("Delete", "simplyconf")}
											onConfirm={() => handleDelete(record.event_id)}
											onCancel={(e) => e.stopPropagation()}
										>
											<span
												type="text"
												onClick={(e) => {
													e.stopPropagation();
												}}
											>
												{__("Delete", "simplyconf")}
											</span>
										</Popconfirm>
									),
									icon: <DeleteOutlined />,
								},
							],
						}}
						placement="left"
					>
						<Button>
							<SettingOutlined />
						</Button>
					</Dropdown>
				</Space>
			),
		},
	];

	// Row selection configuration for bulk actions
	const rowSelection = {
		selectedRowKeys,
		onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
	};

	useEffect(() => {
		dispatch(getEvents());
	}, [dispatch]);

	useEffect(() => {
		const _evtData = [];
		eventIds.forEach((eId) => {
			_evtData.push({ ...events[eId], key: eId });
		});
		setData(_evtData);
	}, [eventIds, events]);

	const launchCreate = () => {
		setIsCreating(true);
	};

	const launchEdit = (evtId) => {
		dispatch(setEventId(evtId));
		setEvent(events[evtId]);
		setIsEditing(true);
	};

	// Refresh handler
	const handleRefresh = () => {
		dispatch(getEvents());
	};

	const handleArchiveToggle = async (evtId, currentStatus) => {
		if (archiveLoading) return; // Prevent multiple concurrent requests

		try {
			setArchiveLoading(true);
			// Convert tinyint status to string for API call
			const isArchived = currentStatus === 0 || currentStatus === "0";
			const newStatus = isArchived ? "active" : "archived";
			await dispatch(
				updateEventStatus({ eventId: evtId, status: newStatus }),
			).unwrap();

			// Show success message
			showSuccess(
				__("Event {status} successfully", "simplyconf").replace(
					"{status}",
					isArchived
						? __("unarchived", "simplyconf")
						: __("archived", "simplyconf"),
				),
			);
		} catch (error) {
			console.error("Failed to update event status:", error);
			showError(__("Failed to update event status", "simplyconf"));
		} finally {
			setArchiveLoading(false);
		}
	};

	const handleDelete = async (eventId = null) => {
		const id = eventId || event?.event_id;
		if (!id) return;
		try {
			await dispatch(deleteEvent(id)).unwrap();
			closeModal();
		} catch (_err) {
			showError(__("Failed to delete event", "simplyconf"));
		}
	};

	const launchView = (evtId) => {
		const evt = events[evtId];
		setEvent(evt);
		setIsViewing(true);
	};

	const closeModal = () => {
		setIsCreating(false);
		setIsEditing(false);
		setIsViewing(false);
		setEvent(null);
	};

	return (
		<React.Fragment>
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
								{__("Events", "simplyconf")}
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
												key: "bulk_archive",
												label: __("Archive Selected", "simplyconf"),
												icon: <InboxOutlined />,
												onClick: handleBulkArchive,
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
								placeholder={__("Search events...", "simplyconf")}
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								className="simplyconf-admin-search"
								allowClear
							/>

							<Select
								value={statusFilter}
								onChange={(value) => setStatusFilter(value)}
								style={{ width: 150 }}
							>
								<Option value="all">{__("All Statuses", "simplyconf")}</Option>
								<Option value="active">{__("Active", "simplyconf")}</Option>
								<Option value="archived">{__("Archived", "simplyconf")}</Option>
							</Select>

							<Button
								type="text"
								icon={<ReloadOutlined />}
								onClick={handleRefresh}
								className="simplyconf-secondary-action-btn"
								title={__("Refresh", "simplyconf")}
							/>

							<Button
								type="primary"
								size="middle"
								onClick={launchCreate}
								icon={<PlusOutlined />}
								className="simplyconf-main-action-btn"
							>
								{__("Create", "simplyconf")}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>

			{events && eventIds.length > 0 ? (
				<Table
					dataSource={filteredData}
					columns={columns}
					rowKey="event_id"
					rowSelection={rowSelection}
					loading={isLoading}
					pagination={getTablePagination({
						total: filteredData.length,
						entityName: __("events", "simplyconf"),
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
			) : (
				<div
					style={{
						background: "#fff",
						borderRadius: "8px",
						padding: "40px",
						textAlign: "center",
						boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
					}}
				>
					<Typography.Text type="secondary">
						{__("Please create an event to get started.", "simplyconf")}
					</Typography.Text>
				</div>
			)}
			<StyledModal
				data-testid="view-event-modal"
				title={event ? event.name : __("Event Details", "simplyconf")}
				titleIcon={<EyeOutlined />}
				headerExtra={
					event && (
						<Space>
							<Typography.Text
								style={{ color: "rgba(255,255,255,0.85)", marginRight: 8 }}
							>
								ID: {event.event_id}
							</Typography.Text>
							{event.status === 0 || event.status === "0" ? (
								<Tag
									color="orange"
									style={{ fontSize: 14, padding: "4px 12px" }}
								>
									{__("Archived", "simplyconf")}
								</Tag>
							) : (
								<Tag
									color="green"
									style={{ fontSize: 14, padding: "4px 12px" }}
								>
									<CheckCircleOutlined /> {__("Active", "simplyconf")}
								</Tag>
							)}
						</Space>
					)
				}
				width={800}
				open={isViewing}
				onCancel={closeModal}
				footer={[
					<Button key="close" onClick={closeModal}>
						{__("Close", "simplyconf")}
					</Button>,
					<Button
						key="edit"
						type="primary"
						icon={<EditOutlined />}
						onClick={() => {
							setIsViewing(false);
							setIsEditing(true);
						}}
					>
						{__("Edit", "simplyconf")}
					</Button>,
				]}
			>
				{event && (
					<div style={{ padding: "8px 0" }}>
						{/* Description */}
						{event.description && (
							<Card
								size="small"
								title={
									<Space>
										<FileTextOutlined />
										<span>{__("Description", "simplyconf")}</span>
									</Space>
								}
								style={{ marginBottom: 16 }}
							>
								<Typography.Paragraph style={{ margin: 0 }}>
									{event.description}
								</Typography.Paragraph>
							</Card>
						)}

						{/* Date Information */}
						<Card
							size="small"
							title={
								<Space>
									<CalendarOutlined />
									<span>{__("Event Schedule", "simplyconf")}</span>
								</Space>
							}
							style={{ marginBottom: 16 }}
						>
							<Row gutter={[16, 16]}>
								<Col span={12}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{__("Start Date", "simplyconf")}
									</Typography.Text>
									<Typography.Text strong>
										{event.start_date
											? (() => {
													const [year, month, day] =
														event.start_date.split("-");
													return new Date(
														year,
														month - 1,
														day,
													).toLocaleDateString("en-US", {
														weekday: "short",
														year: "numeric",
														month: "short",
														day: "numeric",
													});
												})()
											: "-"}
									</Typography.Text>
								</Col>
								<Col span={12}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{__("End Date", "simplyconf")}
									</Typography.Text>
									<Typography.Text strong>
										{event.end_date
											? (() => {
													const [year, month, day] = event.end_date.split("-");
													return new Date(
														year,
														month - 1,
														day,
													).toLocaleDateString("en-US", {
														weekday: "short",
														year: "numeric",
														month: "short",
														day: "numeric",
													});
												})()
											: "-"}
									</Typography.Text>
								</Col>
								<Col span={12}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										<ClockCircleOutlined />{" "}
										{__("Submission Deadline", "simplyconf")}
									</Typography.Text>
									<Typography.Text strong>
										{event.deadline
											? (() => {
													const [year, month, day] = event.deadline.split("-");
													return new Date(
														year,
														month - 1,
														day,
													).toLocaleDateString("en-US", {
														weekday: "short",
														year: "numeric",
														month: "short",
														day: "numeric",
													});
												})()
											: "-"}
									</Typography.Text>
								</Col>
								<Col span={12}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										<ClockCircleOutlined />{" "}
										{__("Review Deadline", "simplyconf")}
									</Typography.Text>
									<Typography.Text strong>
										{event.review_deadline
											? (() => {
													const [year, month, day] =
														event.review_deadline.split("-");
													return new Date(
														year,
														month - 1,
														day,
													).toLocaleDateString("en-US", {
														weekday: "short",
														year: "numeric",
														month: "short",
														day: "numeric",
													});
												})()
											: "-"}
									</Typography.Text>
								</Col>
							</Row>
						</Card>

						{/* Registration Settings */}
						<Card
							size="small"
							title={
								<Space>
									<CheckCircleOutlined />
									<span>{__("Registration Settings", "simplyconf")}</span>
								</Space>
							}
							style={{ marginBottom: 16 }}
						>
							<Row gutter={[16, 16]}>
								<Col span={24}>
									<Typography.Text
										type="secondary"
										style={{ display: "block", marginBottom: 8 }}
									>
										{__("Conference Registration Payment", "simplyconf")}
									</Typography.Text>
									{event.requires_reg_fee === 1 ||
									event.requires_reg_fee === "1" ||
									event.requires_reg_fee === true ? (
										<Tag color="green" style={{ fontSize: 14 }}>
											<CheckCircleOutlined /> {__("Required", "simplyconf")}
										</Tag>
									) : (
										<Tag color="default" style={{ fontSize: 14 }}>
											{__("Optional", "simplyconf")}
										</Tag>
									)}
									<Typography.Text
										type="secondary"
										style={{ display: "block", marginTop: 8, fontSize: 12 }}
									>
										{event.requires_reg_fee === 1 ||
										event.requires_reg_fee === "1" ||
										event.requires_reg_fee === true
											? __(
													"Accepted authors must complete a paid conference registration managed by the Payments add-on.",
													"simplyconf",
												)
											: __(
													"Conference registration payment is not required for this event.",
													"simplyconf",
												)}
									</Typography.Text>
								</Col>
							</Row>
						</Card>

						{/* Location & Shortcode */}
						<Card
							size="small"
							title={
								<Space>
									<SettingOutlined />
									<span>{__("Configuration", "simplyconf")}</span>
								</Space>
							}
							style={{ marginBottom: 16 }}
						>
							<Row gutter={[16, 16]}>
								<Col span={12}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										<EnvironmentOutlined /> {__("Location", "simplyconf")}
									</Typography.Text>
									{event.address ||
									event.street_address ||
									event.city ||
									event.state_province ||
									event.postal_code ||
									event.country ? (
										<div>
											{event.address && (
												<Typography.Text strong style={{ display: "block" }}>
													{event.address}
												</Typography.Text>
											)}
											{event.street_address && (
												<Typography.Text style={{ display: "block" }}>
													{event.street_address}
												</Typography.Text>
											)}
											{(event.city ||
												event.state_province ||
												event.postal_code) && (
												<Typography.Text style={{ display: "block" }}>
													{[event.city, event.state_province, event.postal_code]
														.filter(Boolean)
														.join(", ")}
												</Typography.Text>
											)}
											{event.country && (
												<Typography.Text style={{ display: "block" }}>
													{event.country}
												</Typography.Text>
											)}
										</div>
									) : (
										<Typography.Text strong>
											{__("Not specified", "simplyconf")}
										</Typography.Text>
									)}
								</Col>
								<Col span={12}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{__("Shortcode", "simplyconf")}
									</Typography.Text>
									<Tooltip title={__("Click to copy shortcode", "simplyconf")}>
										<Space
											style={{
												cursor: "pointer",
												padding: "4px 8px",
												background: "#f5f5f5",
												borderRadius: 4,
											}}
											onClick={() => copyShortcode(event.event_id)}
										>
											<Typography.Text
												code
												strong
												style={{ margin: 0, fontSize: 12 }}
											>
												[simplyconf event_id={event.event_id}]
											</Typography.Text>
											<CopyOutlined style={{ color: "#1890ff" }} />
										</Space>
									</Tooltip>
								</Col>
							</Row>
						</Card>

						{/* Statistics */}
						<Card
							size="small"
							title={
								<Space>
									<InboxOutlined />
									<span>{__("Statistics", "simplyconf")}</span>
								</Space>
							}
							style={{ marginBottom: 16 }}
						>
							<Row gutter={[16, 16]}>
								<Col span={8}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{__("Total Submissions", "simplyconf")}
									</Typography.Text>
									<Typography.Title level={4} style={{ margin: 0 }}>
										<Tag
											color={event.submission_count > 0 ? "blue" : "default"}
											style={{ fontSize: 16, padding: "4px 12px" }}
										>
											{event.submission_count || 0}
										</Tag>
									</Typography.Title>
								</Col>
								<Col span={8}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{__("Created", "simplyconf")}
									</Typography.Text>
									<Typography.Text>
										{event.created
											? new Date(event.created).toLocaleDateString("en-US", {
													year: "numeric",
													month: "short",
													day: "numeric",
												})
											: "-"}
									</Typography.Text>
								</Col>
								<Col span={8}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{__("Last Modified", "simplyconf")}
									</Typography.Text>
									<Typography.Text>
										{event.modified
											? new Date(event.modified).toLocaleDateString("en-US", {
													year: "numeric",
													month: "short",
													day: "numeric",
												})
											: "-"}
									</Typography.Text>
								</Col>
							</Row>
						</Card>
					</div>
				)}
			</StyledModal>
			<StyledModal
				data-testid="events-edit-modal"
				title={__("Edit Event", "simplyconf")}
				titleIcon={<EditOutlined />}
				width={720}
				open={isEditing}
				onCancel={closeModal}
				footer={[
					<Popconfirm
						key="delete"
						title={__("Delete Event", "simplyconf")}
						description={__(
							"Are you sure you want to delete this event?",
							"simplyconf",
						)}
						okText={__("Delete", "simplyconf")}
						cancelText={__("Cancel", "simplyconf")}
						placement="topRight"
						onConfirm={handleDelete}
					>
						<Button danger icon={<DeleteOutlined />}>
							{__("Delete", "simplyconf")}
						</Button>
					</Popconfirm>,
					<Button key="cancel" onClick={closeModal}>
						{__("Cancel", "simplyconf")}
					</Button>,
					<Button key="save" type="primary" form="edit-event" htmlType="submit">
						{__("Save", "simplyconf")}
					</Button>,
				]}
			>
				{event && <EditEvent eventId={event.event_id} onClose={closeModal} />}
			</StyledModal>
			<StyledModal
				data-testid="create-event-modal"
				title={__("New Event", "simplyconf")}
				titleIcon={<PlusOutlined />}
				width={720}
				open={isCreating}
				onCancel={closeModal}
				footer={[
					<Button key="cancel" onClick={closeModal}>
						{__("Cancel", "simplyconf")}
					</Button>,
					<Button
						key="create"
						type="primary"
						form="create-event"
						htmlType="submit"
					>
						{__("Create", "simplyconf")}
					</Button>,
				]}
			>
				<CreateEvent onClose={closeModal} />
			</StyledModal>
		</React.Fragment>
	);
};

export default Events;
