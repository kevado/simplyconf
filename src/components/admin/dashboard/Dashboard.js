import {
	CalendarOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CrownOutlined,
	DollarOutlined,
	ExclamationCircleOutlined,
	FileOutlined,
	FileTextOutlined,
	MailOutlined,
	ReloadOutlined,
	SafetyCertificateOutlined,
	ScheduleOutlined,
	StarOutlined,
	TeamOutlined,
	ThunderboltOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import LicenseService from "@services/licenses";
import {
	fetchDashboardActivity,
	fetchDashboardStats,
	selectDashboardActivity,
	selectDashboardActivityLoading,
	selectDashboardError,
	selectDashboardLoading,
	selectDashboardStats,
} from "@state/dashboardSlice";
import { showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Avatar,
	Button,
	Card,
	Col,
	Form,
	List,
	Pagination,
	Row,
	Space,
	Spin,
	Statistic,
	Tag,
	Typography,
	theme,
} from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardSetup from "./DashboardSetup";

const Dashboard = ({ activity = [] }) => {
	const { token } = theme.useToken();
	const dispatch = useDispatch();
	const [_isLicenseModalVisible, setIsLicenseModalVisible] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [licenseForm] = Form.useForm();
	const [licenses, setLicenses] = useState({});
	const [licensesLoading, setLicensesLoading] = useState(true);

	const { getTerm } = useTerminology();
	const isSaas = window.simplyconf?.isSaas === "true";

	// Pagination constants
	const PAGE_SIZE = 5;

	// Redux selectors
	const eventId = useSelector((state) => state.events.globalId);
	const stats = useSelector(selectDashboardStats);
	const loading = useSelector(selectDashboardLoading);
	const recentActivity = useSelector(selectDashboardActivity);
	const activityLoading = useSelector(selectDashboardActivityLoading);
	const _error = useSelector(selectDashboardError);

	// Pagination logic
	const totalActivities = recentActivity?.length || 0;
	const _totalPages = Math.ceil(totalActivities / PAGE_SIZE);
	const startIndex = (currentPage - 1) * PAGE_SIZE;
	const endIndex = startIndex + PAGE_SIZE;
	const paginatedActivity = recentActivity?.slice(startIndex, endIndex) || [];

	const handlePageChange = (page) => {
		setCurrentPage(page);
	};

	const handleRefreshActivity = () => {
		dispatch(fetchDashboardActivity({ eventId, limit: 20 }));
		setCurrentPage(1); // Reset to first page when refreshing
	};

	// Reset to first page when event changes
	useEffect(() => {
		setCurrentPage(1);
	}, []);

	// Fetch dashboard stats on component mount and when event changes
	useEffect(() => {
		if (eventId) {
			dispatch(fetchDashboardStats(eventId));
		}
	}, [dispatch, eventId]);

	// Fetch recent activity
	useEffect(() => {
		dispatch(fetchDashboardActivity({ eventId, limit: 20 }));
	}, [dispatch, eventId]);

	// Fetch license data (skip in SaaS mode)
	useEffect(() => {
		if (isSaas) {
			setLicensesLoading(false);
			return;
		}

		const fetchLicenses = async () => {
			setLicensesLoading(true);
			try {
				const response = await LicenseService.getAllStatus();
				setLicenses(response.licenses || {});
			} catch (error) {
				console.error("Failed to load licenses:", error);
			} finally {
				setLicensesLoading(false);
			}
		};
		fetchLicenses();
	}, [isSaas]);

	// Calculate license summary
	const activeLicenses = Object.values(licenses).filter(
		(license) => license.status === "valid" || license.status === "active",
	);
	const hasActiveLicenses = activeLicenses.length > 0;

	const _handleLicenseActivation = (_values) => {
		// Handle license activation logic here
		showSuccess(__("License activated successfully!", "simplyconf"));
		setIsLicenseModalVisible(false);
		licenseForm.resetFields();
	};

	return (
		<div className="simplyconf-wrapper-container">
			{/* Welcome Header */}
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Typography.Title level={2} style={{ margin: 0, color: "#fff" }}>
							{__("Dashboard Overview", "simplyconf")}
						</Typography.Title>
						<Typography.Text
							style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px" }}
						>
							{__("Welcome to SimplyConf Admin Panel", "simplyconf")}
						</Typography.Text>
					</Col>
				</Row>
			</div>

			{/* Statistics Cards */}
			<Row gutter={[16, 24]} style={{ marginBottom: 32 }}>
				{loading ? (
					<Col span={24}>
						<div style={{ textAlign: "center", padding: "40px" }}>
							<Spin size="large" />
							<div style={{ marginTop: 16 }}>
								{__("Loading dashboard statistics...", "simplyconf")}
							</div>
						</div>
					</Col>
				) : (
					<>
						{/* Abstracts Card */}
						<Col xs={24} sm={12} lg={4}>
							<Card className="simplyconf-stat-card">
								<Statistic
									title={getTerm("abstract", 2)}
									value={stats.abstracts?.total ?? 0}
									prefix={<FileTextOutlined style={{ color: "#1890ff" }} />}
									valueStyle={{ color: "#1890ff", fontSize: "28px" }}
								/>
								<div style={{ marginTop: "12px" }}>
									<div
										style={{
											fontSize: "12px",
											color: "#888",
											marginBottom: "6px",
										}}
									>
										<FileTextOutlined style={{ marginRight: "4px" }} />
										{stats.abstracts?.drafts ?? 0} {__("drafts", "simplyconf")}
									</div>
									<div style={{ fontSize: "12px", color: "#888" }}>
										<FileOutlined style={{ marginRight: "4px" }} />
										{stats.abstracts?.attachments ?? 0}{" "}
										{__("attachments", "simplyconf")}
									</div>
								</div>
							</Card>
						</Col>

						{/* Users Card */}
						<Col xs={24} sm={12} lg={4}>
							<Card className="simplyconf-stat-card">
								<Statistic
									title={getTerm("user", 2)}
									value={stats.users?.total ?? 0}
									prefix={<UserOutlined style={{ color: "#52c41a" }} />}
									valueStyle={{ color: "#52c41a", fontSize: "28px" }}
								/>
								<div style={{ marginTop: "12px" }}>
									<div
										style={{
											fontSize: "12px",
											color: "#888",
											marginBottom: "6px",
										}}
									>
										<UserOutlined style={{ marginRight: "4px" }} />
										{stats.users?.authors ?? 0} {__("authors", "simplyconf")}
									</div>
									<div style={{ fontSize: "12px", color: "#888" }}>
										<TeamOutlined style={{ marginRight: "4px" }} />
										{stats.users?.reviewers ?? 0}{" "}
										{__("reviewers", "simplyconf")}
									</div>
								</div>
							</Card>
						</Col>

						{/* Reviews Card */}
						<Col xs={24} sm={12} lg={4}>
							{stats.reviews?.addon_active ? (
								<Card className="simplyconf-stat-card">
									<Statistic
										title={getTerm("review", 2)}
										value={stats.reviews?.total ?? 0}
										prefix={<StarOutlined style={{ color: "#faad14" }} />}
										valueStyle={{ color: "#faad14", fontSize: "28px" }}
									/>
									<div style={{ marginTop: "12px" }}>
										<div
											style={{
												fontSize: "12px",
												color: "#888",
												marginBottom: "6px",
											}}
										>
											<ClockCircleOutlined style={{ marginRight: "4px" }} />
											{stats.reviews?.pending ?? 0}{" "}
											{__("pending", "simplyconf")}
										</div>
										<div style={{ fontSize: "12px", color: "#888" }}>
											<CalendarOutlined style={{ marginRight: "4px" }} />
											{stats.reviews?.days_remaining !== null &&
											stats.reviews?.days_remaining !== undefined
												? `${stats.reviews.days_remaining} ${__("days to deadline", "simplyconf")}`
												: __("No deadline set", "simplyconf")}
										</div>
									</div>
								</Card>
							) : (
								<Card className="simplyconf-stat-card" style={{ opacity: 0.6 }}>
									<Statistic
										title={getTerm("review", 2)}
										value="—"
										prefix={<StarOutlined style={{ color: "#d9d9d9" }} />}
									/>
									<div
										style={{
											fontSize: "11px",
											color: "#999",
											marginTop: "8px",
										}}
									>
										{__("Addon not active", "simplyconf")}
									</div>
								</Card>
							)}
						</Col>

						{/* Emails Card */}
						<Col xs={24} sm={12} lg={4}>
							{stats.emails?.addon_active ? (
								<Card className="simplyconf-stat-card">
									<Statistic
										title={__("Emails", "simplyconf")}
										value={stats.emails?.sent ?? 0}
										prefix={<MailOutlined style={{ color: "#722ed1" }} />}
										valueStyle={{ color: "#722ed1", fontSize: "28px" }}
									/>
									<div style={{ marginTop: "12px" }}>
										<div
											style={{
												fontSize: "12px",
												color: "#888",
												marginBottom: "6px",
											}}
										>
											<ThunderboltOutlined style={{ marginRight: "4px" }} />
											{stats.emails?.total_triggers ?? 0}{" "}
											{__("triggers", "simplyconf")}
										</div>
										<div style={{ fontSize: "12px", color: "#888" }}>
											<ExclamationCircleOutlined
												style={{ marginRight: "4px" }}
											/>
											{stats.emails?.failed ?? 0} {__("failed", "simplyconf")}
										</div>
									</div>
								</Card>
							) : (
								<Card className="simplyconf-stat-card" style={{ opacity: 0.6 }}>
									<Statistic
										title={__("Emails", "simplyconf")}
										value="—"
										prefix={<MailOutlined style={{ color: "#d9d9d9" }} />}
									/>
									<div
										style={{
											fontSize: "11px",
											color: "#999",
											marginTop: "8px",
										}}
									>
										{__("Addon not active", "simplyconf")}
									</div>
								</Card>
							)}
						</Col>

						{/* Payments Card */}
						<Col xs={24} sm={12} lg={4}>
							{stats.payments?.addon_active ? (
								<Card className="simplyconf-stat-card">
									<Statistic
										title={__("Payments", "simplyconf")}
										value={stats.payments?.total_revenue ?? 0}
										precision={2}
										prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
										valueStyle={{ color: "#52c41a", fontSize: "28px" }}
									/>
									<div style={{ marginTop: "12px" }}>
										<div
											style={{
												fontSize: "12px",
												color: "#888",
												marginBottom: "6px",
											}}
										>
											<TeamOutlined style={{ marginRight: "4px" }} />
											{stats.payments?.registrations ?? 0}{" "}
											{__("registrations", "simplyconf")}
										</div>
										<div style={{ fontSize: "12px", color: "#888" }}>
											<ClockCircleOutlined style={{ marginRight: "4px" }} />
											{stats.payments?.pending_payments ?? 0}{" "}
											{__("pending", "simplyconf")}
										</div>
									</div>
								</Card>
							) : (
								<Card className="simplyconf-stat-card" style={{ opacity: 0.6 }}>
									<Statistic
										title={__("Payments", "simplyconf")}
										value="—"
										prefix={<DollarOutlined style={{ color: "#d9d9d9" }} />}
									/>
									<div
										style={{
											fontSize: "11px",
											color: "#999",
											marginTop: "8px",
										}}
									>
										{__("Addon not active", "simplyconf")}
									</div>
								</Card>
							)}
						</Col>

						{/* Schedules Card */}
						<Col xs={24} sm={12} lg={4}>
							{stats.schedules?.addon_active ? (
								<Card className="simplyconf-stat-card">
									<Statistic
										title={__("Schedules", "simplyconf")}
										value={stats.schedules?.sessions ?? 0}
										prefix={<ScheduleOutlined style={{ color: "#13c2c2" }} />}
										valueStyle={{ color: "#13c2c2", fontSize: "28px" }}
									/>
									<div style={{ marginTop: "12px" }}>
										<div
											style={{
												fontSize: "12px",
												color: "#888",
												marginBottom: "6px",
											}}
										>
											<ClockCircleOutlined style={{ marginRight: "4px" }} />
											{stats.schedules?.sessions ?? 0}{" "}
											{__("total sessions", "simplyconf")}
										</div>
										<div style={{ fontSize: "12px", color: "#888" }}>
											<CalendarOutlined style={{ marginRight: "4px" }} />
											{stats.schedules?.scheduled_abstracts ?? 0}{" "}
											{__("scheduled", "simplyconf")}{" "}
											{getTerm("abstract", 2).toLowerCase()}
										</div>
									</div>
								</Card>
							) : (
								<Card className="simplyconf-stat-card" style={{ opacity: 0.6 }}>
									<Statistic
										title={__("Schedules", "simplyconf")}
										value="—"
										prefix={<ScheduleOutlined style={{ color: "#d9d9d9" }} />}
									/>
									<div
										style={{
											fontSize: "11px",
											color: "#999",
											marginTop: "8px",
										}}
									>
										{__("Addon not active", "simplyconf")}
									</div>
								</Card>
							)}
						</Col>
					</>
				)}
			</Row>

			{/* Recent Activity, Dashboard Setup, and License Management Row */}
			<Row gutter={[24, 24]}>
				<Col xs={24} lg={isSaas ? 16 : 8}>
					<Card
						title={__("Recent Activity", "simplyconf")}
						bordered={false}
						styles={{ body: { padding: "12px" } }}
						extra={
							<Button
								type="text"
								size="small"
								icon={<ReloadOutlined />}
								onClick={handleRefreshActivity}
								loading={activityLoading}
								title={__("Refresh activity", "simplyconf")}
							/>
						}
						className="simplyconf-stat-card"
					>
						{activityLoading ? (
							<div style={{ textAlign: "center", padding: "12px" }}>
								<Spin size="small" />
								<div style={{ marginTop: 8, color: "#888" }}>
									{__("Loading recent activity...", "simplyconf")}
								</div>
							</div>
						) : (
							<>
								<List
									itemLayout="horizontal"
									dataSource={paginatedActivity}
									size="small"
									renderItem={(item, index) => {
										// Get icon based on activity type
										let icon;
										switch (item.type) {
											case "abstract":
												icon = (
													<FileTextOutlined
														style={{ color: "#1890ff", fontSize: "14px" }}
													/>
												);
												break;
											case "review":
												icon = (
													<StarOutlined
														style={{ color: "#faad14", fontSize: "14px" }}
													/>
												);
												break;
											case "registration":
												icon = (
													<UserOutlined
														style={{ color: "#52c41a", fontSize: "14px" }}
													/>
												);
												break;
											case "email":
												icon = (
													<MailOutlined
														style={{ color: "#722ed1", fontSize: "14px" }}
													/>
												);
												break;
											case "attachment":
												icon = (
													<FileOutlined
														style={{ color: "#13c2c2", fontSize: "14px" }}
													/>
												);
												break;
											default:
												icon = (
													<ClockCircleOutlined
														style={{ color: "#666", fontSize: "14px" }}
													/>
												);
										}

										return (
											<List.Item
												key={item.id || index}
												style={{ padding: "8px 0" }}
											>
												<List.Item.Meta
													avatar={<Avatar icon={icon} size={24} />}
													title={
														<div
															style={{ fontSize: "13px", lineHeight: "1.4" }}
														>
															<span style={{ fontWeight: "500" }}>
																{item.user}
															</span>
															<span
																style={{ color: "#666", marginLeft: "4px" }}
															>
																{item.action}
															</span>
															<span
																style={{
																	color: "#999",
																	fontSize: "11px",
																	marginLeft: "8px",
																	fontWeight: "normal",
																}}
															>
																{item.time}
															</span>
														</div>
													}
												/>
											</List.Item>
										);
									}}
									locale={{
										emptyText: __("No recent activity", "simplyconf"),
									}}
								/>
								{totalActivities > PAGE_SIZE && (
									<div style={{ textAlign: "center", marginTop: 8 }}>
										<Pagination
											current={currentPage}
											total={totalActivities}
											pageSize={PAGE_SIZE}
											onChange={handlePageChange}
											size="small"
											showSizeChanger={false}
											showQuickJumper={false}
											showTotal={(total, range) =>
												`${range[0]}-${range[1]} of ${total} activities`
											}
										/>
									</div>
								)}
							</>
						)}
					</Card>
				</Col>

				{/* Dashboard Page Setup */}
				<Col xs={24} lg={isSaas ? 8 : 8}>
					<DashboardSetup eventId={eventId} />
				</Col>

				{!isSaas && (
					<Col xs={24} lg={8}>
						<Card
							title={
								<Space>
									<CrownOutlined style={{ color: "#faad14" }} />
									{__("License Management", "simplyconf")}
								</Space>
							}
							bordered={false}
							className="simplyconf-stat-card"
						>
							{licensesLoading ? (
								<div style={{ textAlign: "center", padding: "20px" }}>
									<Spin size="small" />
								</div>
							) : hasActiveLicenses ? (
								<Space
									direction="vertical"
									style={{ width: "100%" }}
									size="small"
								>
									<div style={{ marginBottom: 8 }}>
										<Tag color="success" icon={<CheckCircleOutlined />}>
											{activeLicenses.length} {__("Active", "simplyconf")}
										</Tag>
										<Tag color="default">
											{Object.keys(licenses).length} {__("Total", "simplyconf")}
										</Tag>
									</div>

									<div style={{ fontSize: "12px" }}>
										{["reviews", "emails", "payments", "schedules", "exports"]
											.filter((slug) => licenses[slug])
											.map((slug) => {
												const license = licenses[slug];
												return (
													<div
														key={slug}
														style={{
															display: "flex",
															alignItems: "center",
															justifyContent: "space-between",
															padding: "6px 0",
															borderBottom: "1px solid #f0f0f0",
														}}
													>
														<Space size={4}>
															<SafetyCertificateOutlined
																style={{
																	color:
																		license.status === "valid" ||
																		license.status === "active"
																			? "#52c41a"
																			: "#d9d9d9",
																}}
															/>
															<span style={{ fontWeight: 500 }}>
																{license.addon}
															</span>
														</Space>
														<Tag
															color={
																license.status === "valid" ||
																license.status === "active"
																	? "success"
																	: "default"
															}
															style={{ margin: 0, fontSize: "11px" }}
														>
															{license.status === "valid" ||
															license.status === "active"
																? __("Active", "simplyconf")
																: __("Inactive", "simplyconf")}
														</Tag>
													</div>
												);
											})}
									</div>

									<Button
										size="small"
										type="link"
										href="#/settings/licenses"
										style={{ marginTop: 8, padding: 0 }}
									>
										{__("Manage Licenses →", "simplyconf")}
									</Button>
								</Space>
							) : (
								<Space direction="vertical" style={{ width: "100%" }}>
									<div style={{ textAlign: "center", marginBottom: 12 }}>
										<Tag color="warning" icon={<ExclamationCircleOutlined />}>
											{__("No Active Licenses", "simplyconf")}
										</Tag>
									</div>

									<Typography.Text
										type="secondary"
										style={{
											fontSize: "12px",
											textAlign: "center",
											display: "block",
										}}
									>
										{__(
											"Activate addon licenses to unlock premium features",
											"simplyconf",
										)}
									</Typography.Text>

									<Button
										size="small"
										type="primary"
										href="#/settings/licenses"
										style={{ marginTop: 8 }}
									>
										{__("Go to Licenses", "simplyconf")}
									</Button>
								</Space>
							)}
						</Card>
					</Col>
				)}
			</Row>
		</div>
	);
};

export default Dashboard;
