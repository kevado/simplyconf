import {
	SearchOutlined,
	UserAddOutlined,
	UserDeleteOutlined,
	UserOutlined,
} from "@ant-design/icons";
import StyledModal from "@components/shared/StyledModal";
import { useTerminology } from "@hooks/useTerminology";
import { getEventUsers } from "@state/userSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Avatar,
	Button,
	Divider,
	Empty,
	Input,
	List,
	Space,
	Spin,
	Tag,
	Typography,
} from "antd";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Search } = Input;
const { Text, Title } = Typography;

const TrackChairAssignmentModal = ({
	visible,
	onClose,
	trackId,
	trackName,
	onAssignmentChange,
	bulkMode = false,
}) => {
	const dispatch = useDispatch();
	const { getTerm } = useTerminology();
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(false);

	const { eventId, trackChairs = {} } = useSelector((state) => ({
		eventId: state.events.globalId,
		trackChairs: state.trackChairs?.trackChairs || {},
	}));

	const {
		users,
		userIds,
		isLoading: usersLoading,
	} = useSelector((state) => ({
		users: state.users.users,
		userIds: state.users.userIds,
		isLoading: state.users.isLoading,
	}));

	// Get track chairs (users with track_chair role for this event)
	const allTrackChairs = userIds
		.map((id) => users[id])
		.filter((user) => {
			if (!user) return false;

			// Check if user has track_chair role - support both array and single role
			const userRoles = Array.isArray(user.roles)
				? user.roles
				: user.role
					? [user.role]
					: [];

			// Also check event_roles if available
			const eventRoles = Array.isArray(user.event_roles)
				? user.event_roles
				: [];

			const allRoles = [...userRoles, ...eventRoles];
			return allRoles.includes("track_chair");
		})
		.filter((chair) =>
			searchTerm
				? chair.display_name
						?.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					chair.email?.toLowerCase().includes(searchTerm.toLowerCase())
				: true,
		);

	// Get currently assigned chair IDs
	const assignedChairIds =
		Array.isArray(trackChairs[trackId]) && trackChairs[trackId].length > 0
			? trackChairs[trackId].map((chair) => Number.parseInt(chair.user_id, 10))
			: [];

	// Filter out already assigned chairs from available list
	const availableChairs = allTrackChairs.filter(
		(chair) => !assignedChairIds.includes(chair.user_id),
	);

	useEffect(() => {
		if (visible) {
			dispatch(getEventUsers(eventId));
		}
	}, [dispatch, visible, eventId]);

	// Get track chair actions from reviews addon
	const assignTrackChair =
		window.simplyconf?.addons?.reviews?.actions?.assignTrackChair;
	const unassignTrackChair =
		window.simplyconf?.addons?.reviews?.actions?.unassignTrackChair;

	const handleAssign = async (chairId) => {
		if (!assignTrackChair) {
			showError(__("Track chair assignment not available", "simplyconf"));
			return;
		}

		setLoading(true);
		try {
			if (bulkMode) {
				// In bulk mode, handle the assignment internally
				const trackIds = Array.isArray(trackId) ? trackId : [trackId];

				await Promise.all(
					trackIds.map((tid) =>
						dispatch(
							assignTrackChair({ trackId: tid, userId: chairId, eventId }),
						).unwrap(),
					),
				);
				showSuccess(__("Track chair assigned successfully", "simplyconf"));
				// Notify parent to refresh tracks list
				if (onAssignmentChange) {
					await onAssignmentChange();
				}
			} else {
				// Single track assignment
				await dispatch(
					assignTrackChair({ trackId, userId: chairId, eventId }),
				).unwrap();
				showSuccess(__("Track chair assigned successfully", "simplyconf"));
				// Notify parent to refresh tracks list
				if (onAssignmentChange) {
					onAssignmentChange();
				}
			}
		} catch (error) {
			showError(
				error.message || __("Failed to assign track chair", "simplyconf"),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleUnassign = async (chairId) => {
		if (!unassignTrackChair) {
			showError(__("Track chair unassignment not available", "simplyconf"));
			return;
		}

		setLoading(true);
		try {
			await dispatch(
				unassignTrackChair({ trackId, userId: chairId, eventId }),
			).unwrap();
			showSuccess(__("Track chair unassigned successfully", "simplyconf"));
			// Notify parent to refresh tracks list
			if (onAssignmentChange) {
				onAssignmentChange();
			}
		} catch (error) {
			const errorMsg =
				error?.message ||
				error ||
				__("Failed to unassign track chair", "simplyconf");
			showError(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	const getAssignmentStatus = (chairId) => {
		const assignment = Array.isArray(trackChairs[trackId])
			? trackChairs[trackId].find((a) => a.user_id === chairId)
			: null;
		if (!assignment) return null;

		return {
			text: __("Assigned", "simplyconf"),
			color: "green",
		};
	};

	return (
		<StyledModal
			title={
				bulkMode
					? __("Bulk Assign Track Chair", "simplyconf")
					: __("Assign Track Chairs", "simplyconf")
			}
			titleIcon={<UserAddOutlined />}
			headerExtra={
				<Text type="secondary">
					{bulkMode
						? `${__("Bulk Assignment", "simplyconf")}: ${trackName}`
						: `${getTerm("track", 1)}: ${trackName}`}
				</Text>
			}
			open={visible}
			onCancel={onClose}
			footer={[
				<Button key="close" onClick={onClose}>
					{__("Close", "simplyconf")}
				</Button>,
			]}
			width={700}
			style={{ top: 20 }}
		>
			<div style={{ marginBottom: 16 }}>
				<Search
					placeholder={__(
						"Search track chairs by name or email...",
						"simplyconf",
					)}
					allowClear
					prefix={<SearchOutlined />}
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					style={{ marginBottom: 16 }}
				/>

				{!bulkMode &&
					Array.isArray(trackChairs[trackId]) &&
					trackChairs[trackId].length > 0 && (
						<>
							<Title level={5}>
								{__("Currently Assigned", "simplyconf")} (
								{trackChairs[trackId].length})
							</Title>
							<List
								dataSource={trackChairs[trackId]}
								renderItem={(assignment) => {
									const chair = users[assignment.user_id];
									const status = getAssignmentStatus(assignment.user_id);

									return (
										<List.Item
											actions={[
												<Button
													key="unassign"
													type="link"
													danger
													icon={<UserDeleteOutlined />}
													onClick={() => handleUnassign(assignment.user_id)}
													loading={loading}
												>
													{__("Unassign", "simplyconf")}
												</Button>,
											]}
										>
											<List.Item.Meta
												avatar={
													<Avatar
														icon={<UserOutlined />}
														style={{ backgroundColor: "#1890ff" }}
													/>
												}
												title={
													<Space>
														{assignment.display_name ||
															chair?.display_name ||
															__("Unknown User", "simplyconf")}
														{status && (
															<Tag color={status.color}>{status.text}</Tag>
														)}
													</Space>
												}
												description={assignment.user_email || chair?.email}
											/>
										</List.Item>
									);
								}}
								style={{ marginBottom: 16 }}
							/>
							<Divider />
						</>
					)}
			</div>

			<Title level={5}>{__("Available Track Chairs", "simplyconf")}</Title>

			{usersLoading ? (
				<div style={{ textAlign: "center", padding: 40 }}>
					<Spin size="large" />
					<div style={{ marginTop: 16 }}>
						{__("Loading track chairs...", "simplyconf")}
					</div>
				</div>
			) : availableChairs.length === 0 ? (
				<Empty
					description={
						searchTerm
							? __(
									"No available track chairs found matching your search",
									"simplyconf",
								)
							: assignedChairIds.length > 0
								? __(
										"All track chairs have been assigned to this track",
										"simplyconf",
									)
								: __("No track chairs available for this event", "simplyconf")
					}
				/>
			) : (
				<List
					dataSource={availableChairs}
					renderItem={(chair) => {
						return (
							<List.Item
								actions={[
									<Button
										key="assign"
										type="primary"
										icon={<UserAddOutlined />}
										onClick={() => handleAssign(chair.user_id)}
										loading={loading}
									>
										{__("Assign", "simplyconf")}
									</Button>,
								]}
							>
								<List.Item.Meta
									avatar={
										<Avatar
											icon={<UserOutlined />}
											style={{ backgroundColor: "#1890ff" }}
										/>
									}
									title={<Space>{chair.display_name}</Space>}
									description={chair.email}
								/>
							</List.Item>
						);
					}}
				/>
			)}
		</StyledModal>
	);
};

TrackChairAssignmentModal.propTypes = {
	visible: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	trackId: PropTypes.oneOfType([
		PropTypes.number,
		PropTypes.arrayOf(PropTypes.number),
	]),
	trackName: PropTypes.string.isRequired,
	onAssignmentChange: PropTypes.func,
	bulkMode: PropTypes.bool,
};

export default TrackChairAssignmentModal;
