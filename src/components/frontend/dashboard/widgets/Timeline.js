import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	FileTextOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { selectActivity, selectActivityLoading } from "@state/frontendSlice";
import { __ } from "@wordpress/i18n";
import { Avatar, Card, List, Space, Spin, Typography } from "antd";
import PropTypes from "prop-types";
import { memo, useMemo } from "react";
import { useSelector } from "react-redux";

/**
 * Timeline Widget - Shows recent activity and events
 * Displays chronological list of recent actions and updates
 */
const Timeline = memo(({ user, eventId, limit = 5 }) => {
	// Get activity from Redux store (already transformed by the slice)
	const activity = useSelector(selectActivity);
	const loading = useSelector(selectActivityLoading);

	// Transform Redux activity data to timeline format with icons
	const timelineItems = useMemo(() => {
		return activity.slice(0, limit).map((item) => {
			let icon;
			let status = "info";

			// Extract type from the action text
			const actionLower = item.action.toLowerCase();
			if (actionLower.includes("abstract")) {
				icon = <FileTextOutlined style={{ color: "#52c41a" }} />;
				status = "success";
			} else if (actionLower.includes("review")) {
				icon = <CheckCircleOutlined style={{ color: "#1890ff" }} />;
				status = "success";
			} else if (actionLower.includes("registered")) {
				icon = <TeamOutlined style={{ color: "#faad14" }} />;
				status = "info";
			} else if (
				actionLower.includes("file") ||
				actionLower.includes("uploaded")
			) {
				icon = <FileTextOutlined style={{ color: "#1890ff" }} />;
				status = "info";
			} else {
				icon = <ClockCircleOutlined style={{ color: "#8c8c8c" }} />;
			}

			return {
				...item,
				icon,
				status,
				timestamp: new Date(item.time),
				title: item.action,
				description: `${item.user}`,
			};
		});
	}, [activity, limit]);

	return (
		<Card
			title={
				<Space>
					<ClockCircleOutlined />
					<span>{__("Recent Activity", "simplyconf")}</span>
				</Space>
			}
			size="small"
			style={{ height: "100%", minHeight: 400 }}
			styles={{ body: { padding: "12px" } }}
		>
			{loading ? (
				<div style={{ textAlign: "center", padding: "40px 0" }}>
					<Spin />
				</div>
			) : timelineItems.length === 0 ? (
				<div style={{ textAlign: "center", padding: "20px 0" }}>
					<ClockCircleOutlined
						style={{ fontSize: 24, color: "#d9d9d9", marginBottom: 8 }}
					/>
					<Typography.Text type="secondary">
						{__("No recent activity", "simplyconf")}
					</Typography.Text>
				</div>
			) : (
				<List
					size="small"
					dataSource={timelineItems}
					split={false}
					renderItem={(item) => (
						<List.Item style={{ padding: "8px 0", border: "none" }}>
							<List.Item.Meta
								avatar={
									<Avatar
										icon={item.icon}
										size={32}
										style={{ flexShrink: 0 }}
									/>
								}
								title={
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											fontSize: 14,
										}}
									>
										<span>{item.title}</span>
									</div>
								}
								description={
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: 2,
										}}
									>
										{/* <Typography.Text type='secondary' style={{ fontSize: 12 }}>
										{item.description}
									</Typography.Text> */}
										<Typography.Text type="secondary" style={{ fontSize: 11 }}>
											{item.time}
										</Typography.Text>
									</div>
								}
							/>
						</List.Item>
					)}
				/>
			)}
		</Card>
	);
});

Timeline.propTypes = {
	user: PropTypes.object,
	eventId: PropTypes.number,
	limit: PropTypes.number,
};

export default Timeline;
