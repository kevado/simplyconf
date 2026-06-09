import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import {
	selectActionItems,
	selectActionItemsLoading,
} from "@state/frontendSlice";
import { __ } from "@wordpress/i18n";
import { Badge, Card, List, Space, Spin, Typography } from "antd";
import PropTypes from "prop-types";
import { memo, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

/**
 * ActionItems Widget - Shows pending tasks and notifications for the user
 * Displays different action items based on user roles and current status
 */
const ActionItems = memo(({ user, eventId, onActionClick }) => {
	const navigate = useNavigate();
	const { getTerm } = useTerminology();

	// Get action items from Redux store
	const items = useSelector(selectActionItems);
	const loading = useSelector(selectActionItemsLoading);

	// Map action items to include icons
	const actionItems = useMemo(() => {
		return items.map((item) => {
			let icon;
			if (item.priority === "high") {
				icon = <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />;
			} else {
				icon = <ClockCircleOutlined style={{ color: "#faad14" }} />;
			}
			return { ...item, icon };
		});
	}, [items]);

	// Handle action clicks
	const handleActionClick = useCallback(
		(item) => {
			if (onActionClick) {
				onActionClick(item);
			} else if (item.actionUrl) {
				// Convert hash URLs to proper routes
				const route = item.actionUrl.replace("#/", "/");
				navigate(route);
			}
		},
		[onActionClick, navigate],
	);

	return (
		<Card
			title={
				<Space>
					<span>{__("Action Items", "simplyconf")}</span>
					{actionItems.length > 0 && (
						<Badge count={actionItems.length} size="small" />
					)}
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
			) : actionItems.length === 0 ? (
				<div style={{ textAlign: "center", padding: "20px 0" }}>
					<CheckCircleOutlined
						style={{ fontSize: 24, color: "#52c41a", marginBottom: 8 }}
					/>
					<Typography.Text type="secondary">
						All caught up! No pending actions.
					</Typography.Text>
				</div>
			) : (
				<List
					size="small"
					dataSource={actionItems}
					split={false}
					renderItem={(item) => (
						<List.Item
							style={{ padding: "8px 0", cursor: "pointer" }}
							onClick={() => handleActionClick(item)}
						>
							<List.Item.Meta
								avatar={<div style={{ fontSize: 20 }}>{item.icon}</div>}
								title={
									<div style={{ display: "flex", gap: 8, fontSize: 14 }}>
										<span>{item.title}</span>
									</div>
								}
								description={
									<span style={{ fontSize: 12 }}>{item.description}</span>
								}
							/>
						</List.Item>
					)}
				/>
			)}
		</Card>
	);
});

ActionItems.propTypes = {
	user: PropTypes.object,
	eventId: PropTypes.number,
	onActionClick: PropTypes.func,
};

export default ActionItems;
