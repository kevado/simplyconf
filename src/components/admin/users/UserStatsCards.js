import {
	CheckCircleOutlined,
	TeamOutlined,
	UserAddOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import { __ } from "@wordpress/i18n";
import { Card, Col, Row, Statistic } from "antd";
import { useMemo } from "react";

const UserStatsCards = ({ users }) => {
	const { getTerm } = useTerminology();

	const stats = useMemo(() => {
		if (!users || !Array.isArray(users)) {
			return {
				total: 0,
				trackChairs: 0,
				reviewers: 0,
				authors: 0,
			};
		}

		// Calculate stats
		const total = users.length;

		// Count users by role
		const trackChairs = users.filter((u) => {
			const userRoles = u.roles || [];
			const currentRoles = Array.isArray(userRoles)
				? userRoles
				: userRoles
					? [userRoles]
					: u.role
						? [u.role]
						: ["viewer"];
			return currentRoles.includes("track_chair");
		}).length;

		const reviewers = users.filter((u) => {
			const userRoles = u.roles || [];
			const currentRoles = Array.isArray(userRoles)
				? userRoles
				: userRoles
					? [userRoles]
					: u.role
						? [u.role]
						: ["viewer"];
			return currentRoles.includes("reviewer");
		}).length;

		const authors = users.filter((u) => {
			const userRoles = u.roles || [];
			const currentRoles = Array.isArray(userRoles)
				? userRoles
				: userRoles
					? [userRoles]
					: u.role
						? [u.role]
						: ["viewer"];
			return currentRoles.includes("author");
		}).length;

		const viewers = users.filter((u) => {
			const userRoles = u.roles || [];
			const currentRoles = Array.isArray(userRoles)
				? userRoles
				: userRoles
					? [userRoles]
					: u.role
						? [u.role]
						: ["viewer"];
			return currentRoles.includes("viewer");
		}).length;

		return {
			total,
			trackChairs,
			reviewers,
			authors,
			viewers,
		};
	}, [users]);

	return (
		<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
			<Col xs={24} sm={6} md={5}>
				<Card
					bordered={false}
					style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", height: "100%" }}
				>
					<Statistic
						title={__("Total %s", "simplyconf").replace(
							"%s",
							getTerm("user", 2),
						)}
						value={stats.total}
						valueStyle={{ color: "#1890ff" }}
						prefix={<UserOutlined />}
					/>
				</Card>
			</Col>
			<Col xs={24} sm={6} md={4}>
				<Card
					bordered={false}
					style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", height: "100%" }}
				>
					<Statistic
						title={__("Track Chairs", "simplyconf")}
						value={stats.trackChairs}
						valueStyle={{ color: "#722ed1" }}
						prefix={<TeamOutlined />}
					/>
				</Card>
			</Col>
			<Col xs={24} sm={6} md={5}>
				<Card
					bordered={false}
					style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", height: "100%" }}
				>
					<Statistic
						title={getTerm("reviewer", 2)}
						value={stats.reviewers}
						valueStyle={{ color: "#faad14" }}
						prefix={<CheckCircleOutlined />}
					/>
				</Card>
			</Col>
			<Col xs={24} sm={6} md={5}>
				<Card
					bordered={false}
					style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", height: "100%" }}
				>
					<Statistic
						title={getTerm("author", 2)}
						value={stats.authors}
						valueStyle={{ color: "#52c41a" }}
						prefix={<UserAddOutlined />}
					/>
				</Card>
			</Col>
			<Col xs={24} sm={6} md={5}>
				<Card
					bordered={false}
					style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", height: "100%" }}
				>
					<Statistic
						title={__("Viewers", "simplyconf")}
						value={stats.viewers}
						valueStyle={{ color: "#8c8c8c" }}
						prefix={<UserOutlined />}
					/>
				</Card>
			</Col>
		</Row>
	);
};

export default UserStatsCards;
