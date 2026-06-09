import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	FileTextOutlined,
	TrophyOutlined,
} from "@ant-design/icons";
import {
	selectDashboardStats,
	selectDashboardStatsLoading,
} from "@state/frontendSlice";
import { __ } from "@wordpress/i18n";
import { Card, Progress, Spin, Statistic } from "antd";
import PropTypes from "prop-types";
import { memo, useMemo } from "react";
import { useSelector } from "react-redux";

/**
 * Stats Widget - Shows dashboard statistics and metrics
 * Displays key numbers and progress indicators for user activity
 */
const Stats = memo(({ user, eventId }) => {
	const userRoles = user?.event_roles || [];
	const isAuthor = userRoles.includes("author");
	const isReviewer = userRoles.includes("reviewer");
	const isTrackChair = userRoles.includes("track_chair");

	// Get stats from Redux store
	const stats = useSelector(selectDashboardStats);
	const loading = useSelector(selectDashboardStatsLoading);

	// Memoize completion rate calculation
	const completionRate = useMemo(() => {
		if (isReviewer && stats.reviews.assigned > 0) {
			return Math.round(
				(stats.reviews.completed / stats.reviews.assigned) * 100,
			);
		}
		if (isAuthor && stats.submissions.total > 0) {
			const completed = stats.submissions.total - stats.submissions.draft;
			return Math.round((completed / stats.submissions.total) * 100);
		}
		if (isTrackChair && stats.track.submissions > 0) {
			return Math.round((stats.track.assigned / stats.track.submissions) * 100);
		}
		return 0;
	}, [stats, isAuthor, isReviewer, isTrackChair]);

	return (
		<Card
			title={__("Statistics", "simplyconf")}
			size="small"
			style={{ height: "100%", minHeight: 400 }}
		>
			{loading ? (
				<div style={{ textAlign: "center", padding: "40px 0" }}>
					<Spin />
				</div>
			) : isAuthor || isReviewer || isTrackChair ? (
				<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					{isAuthor && (
						<div>
							<Statistic
								title={__("My Submissions", "simplyconf")}
								value={stats.submissions.total}
								prefix={<FileTextOutlined />}
								valueStyle={{ color: "#1890ff" }}
							/>
							<Progress
								percent={Math.round(
									(stats.submissions.accepted / stats.submissions.total) * 100,
								)}
								size="small"
								status={stats.submissions.accepted > 0 ? "success" : "normal"}
								format={(_percent) => `${stats.submissions.accepted} accepted`}
								style={{ marginTop: 8 }}
							/>
						</div>
					)}
					{isReviewer && (
						<div>
							<Statistic
								title={__("Reviews Completed", "simplyconf")}
								value={stats.reviews.completed}
								suffix={`/ ${stats.reviews.assigned}`}
								prefix={<CheckCircleOutlined />}
								valueStyle={{ color: "#52c41a" }}
							/>
							<Progress
								percent={completionRate}
								size="small"
								status={stats.reviews.overdue > 0 ? "exception" : "success"}
								style={{ marginTop: 8 }}
							/>
						</div>
					)}
					{isTrackChair && (
						<div>
							<Statistic
								title={__("Track Submissions", "simplyconf")}
								value={stats.track.submissions}
								prefix={<FileTextOutlined />}
								valueStyle={{ color: "#faad14" }}
							/>
							<Progress
								percent={completionRate}
								size="small"
								status="active"
								format={(_percent) => `${stats.track.assigned} assigned`}
								style={{ marginTop: 8 }}
							/>
						</div>
					)}
					{completionRate > 0 && (
						<div>
							<Statistic
								title={__("Overall Progress", "simplyconf")}
								value={completionRate}
								suffix="%"
								prefix={<TrophyOutlined />}
								valueStyle={{
									color: completionRate === 100 ? "#52c41a" : "#1890ff",
								}}
							/>
							<Progress
								percent={completionRate}
								size="small"
								status={completionRate === 100 ? "success" : "active"}
								showInfo={false}
								style={{ marginTop: 8 }}
							/>
						</div>
					)}
				</div>
			) : (
				<div style={{ textAlign: "center", padding: "20px 0" }}>
					<ClockCircleOutlined
						style={{ fontSize: 24, color: "#d9d9d9", marginBottom: 8 }}
					/>
					<div style={{ color: "#8c8c8c" }}>
						No role-specific statistics available
					</div>
				</div>
			)}
		</Card>
	);
});

Stats.propTypes = {
	user: PropTypes.object,
	eventId: PropTypes.number,
};

export default Stats;
