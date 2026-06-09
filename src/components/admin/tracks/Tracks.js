import {
	DeleteOutlined,
	EditOutlined,
	FolderOutlined,
	MoreOutlined,
	PlusOutlined,
	SettingOutlined,
	UserAddOutlined,
	UserSwitchOutlined,
} from "@ant-design/icons";
import FormSection from "@components/shared/FormSection";
import StyledModal from "@components/shared/StyledModal";
import { useTerminology } from "@hooks/useTerminology";
import {
	createTrack,
	deleteTrack,
	getTracks,
	updateTrack,
} from "@state/trackSlice";
import { getEventUsers } from "@state/userSlice";
import axios from "@utils/axios";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Col,
	Dropdown,
	Form,
	Input,
	Modal,
	Popconfirm,
	Row,
	Space,
	Table,
	Typography,
	theme,
} from "antd";
import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sprintf } from "sprintf-js";
import TrackChairAssignmentModal from "./TrackChairAssignmentModal";

const { Text } = Typography;
const { Search } = Input;

const SessionTable = ({ sessions, loading, onEdit, onDelete }) => {
	const columns = [
		{ title: __("Name", "simplyconf"), dataIndex: "name", key: "name" },
		{
			title: __("Start Time", "simplyconf"),
			dataIndex: "start_time",
			key: "start_time",
		},
		{
			title: __("End Time", "simplyconf"),
			dataIndex: "end_time",
			key: "end_time",
		},
		{
			title: __("Location", "simplyconf"),
			dataIndex: "location",
			key: "location",
		},
		{
			title: __("Actions", "simplyconf"),
			key: "actions",
			render: (_, record) => {
				const menuItems = [
					{
						key: "edit",
						icon: <EditOutlined />,
						label: __("Edit Session", "simplyconf"),
						onClick: () => onEdit(record),
					},
					{
						key: "delete",
						icon: <DeleteOutlined />,
						label: (
							<Popconfirm
								placement="topRight"
								title={__("Confirmation", "simplyconf")}
								description={__(
									"Are you sure you want to delete this session?",
									"simplyconf",
								)}
								okText={__("Delete", "simplyconf")}
								onConfirm={() => onDelete(record.session_id)}
								onCancel={(e) => e.stopPropagation()}
							>
								<span
									type="text"
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									{__("Delete Session", "simplyconf")}
								</span>
							</Popconfirm>
						),
						danger: true,
					},
				];

				return (
					<Dropdown menu={{ items: menuItems }} placement="left">
						<Button>
							<SettingOutlined />
						</Button>
					</Dropdown>
				);
			},
		},
	];
	return (
		<Table
			columns={columns}
			dataSource={sessions}
			rowKey="session_id"
			loading={loading}
			pagination={false}
			size="small"
		/>
	);
};

SessionTable.propTypes = {
	sessions: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	onEdit: PropTypes.func.isRequired,
	onDelete: PropTypes.func.isRequired,
};

const Tracks = () => {
	const dispatch = useDispatch();
	const { token } = theme.useToken();
	const { getTerm } = useTerminology();
	const eventId = useSelector((state) => state.events.globalId);
	const { tracks, isLoading } = useSelector((state) => state.tracks);
	const { trackChairs = {} } = useSelector((state) => state.trackChairs || {});
	const { users, userIds } = useSelector((state) => state.users);

	// Get track chair actions from reviews addon
	const getTrackChairs =
		window.simplyconf?.addons?.reviews?.actions?.getTrackChairs;
	const assignTrackChair =
		window.simplyconf?.addons?.reviews?.actions?.assignTrackChair;
	const unassignTrackChair =
		window.simplyconf?.addons?.reviews?.actions?.unassignTrackChair;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	const [form] = Form.useForm();

	// Track Chair Assignment Modal
	const [isChairModalOpen, setIsChairModalOpen] = useState(false);
	const [managingTrack, setManagingTrack] = useState(null);

	// Search state
	const [searchText, setSearchText] = useState("");

	// Bulk actions state
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);
	const [isBulkChairModalOpen, setIsBulkChairModalOpen] = useState(false);

	useEffect(() => {
		if (eventId) {
			dispatch(getTracks(eventId));
			dispatch(getEventUsers(eventId));
		}
	}, [dispatch, eventId]);

	// Fetch track chairs for all tracks when they're loaded
	useEffect(() => {
		if (eventId && tracks.length > 0 && getTrackChairs) {
			tracks.forEach((track) => {
				dispatch(getTrackChairs({ trackId: track.track_id, eventId }));
			});
		}
	}, [dispatch, eventId, tracks, getTrackChairs]);

	const openModal = (record = null) => {
		setEditing(record);
		setIsModalOpen(true);
		if (record) {
			form.setFieldsValue(record);
		} else {
			form.resetFields();
		}
	};

	const handleDelete = async (id) => {
		try {
			await dispatch(deleteTrack(id)).unwrap();
		} catch (_err) {
			showError(__("Failed to delete track", "simplyconf"));
		}
	};

	const handleSave = async () => {
		const values = await form.validateFields();
		try {
			if (editing) {
				await dispatch(
					updateTrack({ id: editing.track_id, payload: values }),
				).unwrap();
			} else {
				await dispatch(createTrack(values)).unwrap();
			}
			setIsModalOpen(false);
		} catch (_err) {
			showError(__("Failed to save track", "simplyconf"));
		}
	};

	// Track chair assignment handlers
	const _handleAssignTrackChair = async (trackId, userId, eventId) => {
		try {
			await dispatch(assignTrackChair({ trackId, userId, eventId })).unwrap();
			showSuccess(__("Track chair assigned successfully", "simplyconf"));
			return true;
		} catch (_error) {
			showError(__("Failed to assign track chair", "simplyconf"));
			return false;
		}
	};

	const _handleUnassignTrackChair = async (trackId, userId, eventId) => {
		try {
			await dispatch(unassignTrackChair({ trackId, userId, eventId })).unwrap();
			showSuccess(__("Track chair unassigned successfully", "simplyconf"));
			return true;
		} catch (_error) {
			showError(__("Failed to unassign track chair", "simplyconf"));
			return false;
		}
	};

	// Open chair management modal
	const openChairModal = (track) => {
		setManagingTrack(track);
		setIsChairModalOpen(true);
	};

	// Handle chair assignment change
	const handleChairAssignmentChange = () => {
		// Refresh track chairs data
		if (managingTrack && getTrackChairs) {
			dispatch(getTrackChairs({ trackId: managingTrack.track_id, eventId }));
		}
	};

	// Bulk actions handlers
	const handleBulkDelete = () => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: __("Delete Tracks", "simplyconf"),
			content: __(
				"Are you sure you want to delete {selectedRowKeys.length} selected tracks? This action cannot be undone.",
				"simplyconf",
			).replace("{selectedRowKeys.length}", selectedRowKeys.length),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					// Delete all tracks in parallel, then refetch once
					await Promise.all(
						selectedRowKeys.map((id) => axios.delete(`/tracks/${id}`)),
					);
					await dispatch(getTracks(eventId));
					showSuccess(
						`${selectedRowKeys.length} ${__("tracks deleted successfully", "simplyconf")}`,
					);
					setSelectedRowKeys([]);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showError(
						__(
							"Some tracks could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	const handleBulkAssignChairs = () => {
		if (selectedRowKeys.length === 0) {
			showWarning(__("Please select at least one track", "simplyconf"));
			return;
		}
		setIsBulkChairModalOpen(true);
	};

	const handleBulkChairAssignmentComplete = async () => {
		// The new modal handles the assignment internally
		// This callback is just to refresh data after assignment completes
		setIsBulkChairModalOpen(false);
		setSelectedRowKeys([]);

		// Refresh track chairs for all affected tracks
		if (getTrackChairs) {
			selectedRowKeys.forEach((trackId) => {
				dispatch(getTrackChairs({ trackId, eventId }));
			});
		}
	};

	// Memoized filtered data based on search
	const filteredTracks = useMemo(() => {
		if (!searchText) return tracks;

		return tracks.filter(
			(track) =>
				track.name?.toLowerCase().includes(searchText.toLowerCase()) ||
				track.description?.toLowerCase().includes(searchText.toLowerCase()),
		);
	}, [tracks, searchText]);

	const columns = [
		{
			title: __("ID", "simplyconf"),
			dataIndex: "track_id",
			key: "track_id",
			width: 80,
			sorter: (a, b) => a.track_id - b.track_id,
		},
		{
			title: __("Name", "simplyconf"),
			dataIndex: "name",
			key: "name",
			render: (text, record) => (
				<Button
					type="link"
					onClick={() => openModal(record)}
					className="simplyconf-table-link"
				>
					{text}
				</Button>
			),
		},
		{
			title: __("Description", "simplyconf"),
			dataIndex: "description",
			key: "description",
		},
		{
			title: __("Track Chairs", "simplyconf"),
			key: "trackChairs",
			width: 200,
			sorter: (a, b) => {
				const aChairs =
					trackChairs[String(a.track_id)] || trackChairs[a.track_id] || [];
				const bChairs =
					trackChairs[String(b.track_id)] || trackChairs[b.track_id] || [];
				return aChairs.length - bChairs.length;
			},
			render: (_, record) => {
				// Convert to string to match object key type
				const chairs =
					trackChairs[String(record.track_id)] ||
					trackChairs[record.track_id] ||
					[];
				const chairCount = chairs.length;

				if (chairCount === 0) {
					return (
						<Button
							type="link"
							size="small"
							icon={<UserSwitchOutlined />}
							onClick={() => openChairModal(record)}
							style={{ padding: 0, color: token.colorPrimary }}
						>
							{__("Add Chairs", "simplyconf")}
						</Button>
					);
				}

				// Get chair names for display
				const chairNames = chairs
					.map(
						(chair) =>
							chair.display_name || `${chair.first_name} ${chair.last_name}`,
					)
					.filter((name) => name && name.trim() !== "")
					.join(", ");

				// Show first 2 names, then "..."
				const names = chairNames.split(", ");
				const displayText =
					names.length > 2 ? `${names.slice(0, 2).join(", ")}...` : chairNames;

				return (
					<Space direction="vertical" size={0} style={{ width: "100%" }}>
						<Text ellipsis={{ tooltip: chairNames }} style={{ maxWidth: 150 }}>
							{displayText}
						</Text>
						<Button
							type="link"
							size="small"
							onClick={() => openChairModal(record)}
							style={{ padding: 0, height: "auto", color: token.colorPrimary }}
						>
							{__("Manage ({chairCount})", "simplyconf").replace(
								"{chairCount}",
								chairCount,
							)}
						</Button>
					</Space>
				);
			},
		},
		{
			title: __("Actions", "simplyconf"),
			key: "actions",
			width: 80,
			render: (_, record) => {
				const menuItems = [
					{
						key: "edit",
						icon: <EditOutlined />,
						label: __("Edit Track", "simplyconf"),
						onClick: () => openModal(record),
					},
					{
						key: "chairs",
						icon: <UserAddOutlined />,
						label: __("Manage Chairs", "simplyconf"),
						onClick: () => openChairModal(record),
					},
					{
						key: "delete",
						icon: <DeleteOutlined />,
						label: (
							<Popconfirm
								placement="topRight"
								title={__("Confirmation", "simplyconf")}
								description={__(
									"Are you sure you want to delete this track?",
									"simplyconf",
								)}
								okText={__("Delete", "simplyconf")}
								onConfirm={() => handleDelete(record.track_id)}
								onCancel={(e) => e.stopPropagation()}
							>
								<span
									type="text"
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									{__("Delete Track", "simplyconf")}
								</span>
							</Popconfirm>
						),
						danger: true,
					},
				];

				return (
					<Dropdown menu={{ items: menuItems }} placement="left">
						<Button>
							<SettingOutlined />
						</Button>
					</Dropdown>
				);
			},
		},
	];

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
			{/* Colorful Header with Search and Bulk Actions */}
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
								{getTerm("track", 2)}
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
								({filteredTracks.length} of {tracks.length})
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
												key: "bulk_assign_chairs",
												label: __("Assign Track Chairs", "simplyconf"),
												icon: <UserAddOutlined />,
												onClick: handleBulkAssignChairs,
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
										{__("Bulk Actions", "simplyconf")} ({selectedRowKeys.length}
										) <MoreOutlined />
									</Button>
								</Dropdown>
							)}
							<Search
								placeholder={__("Search tracks", "simplyconf")}
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								className="simplyconf-admin-search"
								allowClear
							/>

							<Button
								type="primary"
								size="middle"
								onClick={() => openModal()}
								icon={<PlusOutlined />}
								className="simplyconf-main-action-btn"
							>
								{__("Create", "simplyconf")}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>

			<Row gutter={12}>
				<Col className="gutter-row" span={24}>
					<Table
						columns={columns}
						dataSource={filteredTracks}
						rowKey="track_id"
						rowSelection={rowSelection}
						loading={isLoading}
						pagination={getTablePagination({
							total: filteredTracks.length,
							entityName: __("tracks", "simplyconf"),
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
				</Col>
			</Row>

			{/* Add/Edit Track Modal */}
			<StyledModal
				data-testid="track-modal"
				title={
					editing
						? __("Edit Track", "simplyconf")
						: __("Add Track", "simplyconf")
				}
				titleIcon={editing ? <EditOutlined /> : <PlusOutlined />}
				open={isModalOpen}
				onCancel={() => {
					setIsModalOpen(false);
					setEditing(null);
					form.resetFields();
				}}
				onOk={handleSave}
				okText={__("Save", "simplyconf")}
				cancelText={__("Cancel", "simplyconf")}
				width={720}
			>
				<Form form={form} layout="vertical">
					<FormSection
						title={__("Track Information", "simplyconf")}
						icon={<FolderOutlined />}
					>
						<Row gutter={16}>
							<Col span={24}>
								<Form.Item
									name="name"
									label={__("Track Name", "simplyconf")}
									rules={[
										{
											required: true,
											message: __("Please enter a track name", "simplyconf"),
										},
									]}
								>
									<Input placeholder={__("Enter track name", "simplyconf")} />
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={24}>
								<Form.Item
									name="description"
									label={__("Description", "simplyconf")}
								>
									<Input.TextArea
										rows={4}
										placeholder={__(
											"Enter track description (optional)",
											"simplyconf",
										)}
									/>
								</Form.Item>
							</Col>
						</Row>
					</FormSection>
				</Form>
			</StyledModal>

			{/* Track Chair Assignment Modal */}
			{managingTrack && (
				<TrackChairAssignmentModal
					visible={isChairModalOpen}
					onClose={() => {
						setIsChairModalOpen(false);
						setManagingTrack(null);
					}}
					trackId={managingTrack.track_id}
					trackName={managingTrack.name}
					onAssignmentChange={handleChairAssignmentChange}
				/>
			)}

			{/* Bulk Track Chair Assignment Modal */}
			<TrackChairAssignmentModal
				visible={isBulkChairModalOpen}
				onClose={() => {
					setIsBulkChairModalOpen(false);
					setSelectedRowKeys([]);
				}}
				trackId={selectedRowKeys}
				trackName={sprintf(
					__("Bulk Assignment (%d tracks)", "simplyconf"),
					selectedRowKeys.length,
				)}
				onAssignmentChange={handleBulkChairAssignmentComplete}
				bulkMode={true}
			/>
		</React.Fragment>
	);
};

export default Tracks;
