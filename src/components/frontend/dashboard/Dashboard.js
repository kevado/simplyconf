import { useTerminology } from "@hooks/useTerminology";
import {
	fetchActionItems,
	fetchDashboardActivity,
	fetchMyStats,
} from "@state/frontendSlice";
import { __ } from "@wordpress/i18n";
import { Col, Row, Spin, Typography } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { ActionItems, Stats, Timeline } from "./widgets";

const Dashboard = () => {
	const dispatch = useDispatch();
	const { user, isLoading } = useSelector((state) => state.auth);
	const { getTerm } = useTerminology();
	const eventId = window.simplyconf?.eventId;

	// Fetch dashboard data on mount
	useEffect(() => {
		if (!eventId) return;

		dispatch(fetchMyStats(eventId));
		dispatch(fetchActionItems(eventId));
		dispatch(fetchDashboardActivity({ eventId, limit: 5 }));
	}, [dispatch, eventId]);

	if (isLoading) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16 }}>{__("Loading...", "simplyconf")}</div>
			</div>
		);
	}

	return (
		<div>
			<div style={{ maxWidth: 1400, margin: "0 auto" }}>
				<Typography.Title level={3} style={{ marginBottom: 24, marginTop: 0 }}>
					📊 {__("Dashboard Overview", "simplyconf")}
				</Typography.Title>
				{/* Dashboard Widgets Row */}
				<Row gutter={[24, 24]}>
					<Col xs={24} sm={24} md={8}>
						<Stats user={user} eventId={eventId} />
					</Col>
					<Col xs={24} sm={24} md={8}>
						<Timeline user={user} eventId={eventId} />
					</Col>
					<Col xs={24} sm={24} md={8}>
						<ActionItems user={user} eventId={eventId} />
					</Col>
				</Row>
			</div>
		</div>
	);
};

export default Dashboard;
