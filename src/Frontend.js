import {
	AppstoreOutlined,
	CreditCardOutlined,
	DownOutlined,
	FileTextOutlined,
	LogoutOutlined,
	MenuOutlined,
	SettingOutlined,
	StarOutlined,
	TeamOutlined,
	UserOutlined,
} from "@ant-design/icons";
import Login from "@components/frontend/auth/Login";
import { useTerminology } from "@hooks/useTerminology";
import {
	checkSession,
	clearAuth,
	logout,
	setAuthenticated,
} from "@state/authSlice";
import { getEvents } from "@state/eventSlice";
import { getSettings } from "@state/settingSlice";
import { getAntdLocale, getTextDirection } from "@utils/locale";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Badge,
	Button,
	ConfigProvider,
	Drawer,
	Dropdown,
	Menu,
	Space,
	Spin,
	Tabs,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const allMenuItems = [
	{
		key: "dashboard",
		icon: <AppstoreOutlined />,
		label: "dashboard",
		roles: ["author", "reviewer", "track_chair", "viewer"],
	},
	{
		key: "submissions",
		icon: <FileTextOutlined />,
		label: "submissions",
		roles: ["author"],
	},
	{
		key: "reviews",
		icon: <StarOutlined />,
		label: "reviews",
		roles: ["reviewer"],
	},
	{
		key: "tracks",
		icon: <TeamOutlined />,
		label: "tracks",
		roles: ["track_chair"],
	},
];

// Role priority for determining default landing page (higher priority = checked first)
// This determines which page a user lands on after login based on their roles
const ROLE_LANDING_PRIORITY = [
	{ role: "author", route: "submissions" },
	{ role: "reviewer", route: "reviews" },
	{ role: "track_chair", route: "tracks" },
	{ role: "viewer", route: "conference-registration" },
];

const Frontend = () => {
	const [currentTab, setCurrentTab] = useState("submissions");
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [sessionChecked, setSessionChecked] = useState(false);
	const [sessionCheckTrigger, setSessionCheckTrigger] = useState(0); // Used to force session re-check
	const [antdLocale, setAntdLocale] = useState(null);
	const [direction, setDirection] = useState("ltr");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	// Get event ID from shortcode context (set via wp_localize_script)
	const eventId = window.simplyconf?.eventId;

	const { getTerm } = useTerminology();

	const { isAuthenticated, user, currentEvent } = useSelector((state) => ({
		isAuthenticated: state.auth.isAuthenticated,
		user: state.auth.user,
		currentEvent: state.events.events[eventId],
	}));

	useEffect(() => {
		// Check session on mount and when sessionCheckTrigger changes
		if (sessionChecked && sessionCheckTrigger === 0) {
			return;
		}

		setLoading(true);

		dispatch(checkSession())
			.then((res) => {
				if (res.meta.requestStatus === "fulfilled" && res.payload) {
					setRoles(res.payload.event_roles || []);
					dispatch(setAuthenticated(true));
					// Fetch event data to check requires_reg_fee
					dispatch(getEvents());
					// Load settings for terminology and other customizations
					dispatch(getSettings(eventId));
				} else {
					setRoles([]);
					dispatch(setAuthenticated(false));
				}
				setLoading(false);
				setSessionChecked(true);
			})
			.catch((err) => {
				console.error("[Frontend] Session check error:", err);
				setRoles([]);
				dispatch(setAuthenticated(false));
				setLoading(false);
				setSessionChecked(true);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionCheckTrigger, dispatch, eventId, sessionChecked]); // Re-run when trigger changes

	useEffect(() => {
		// Load Ant Design locale dynamically based on current WordPress locale
		getAntdLocale().then((locale) => {
			setAntdLocale(locale);
		});

		// Set text direction based on locale
		setDirection(getTextDirection());
	}, []);

	const eventsLoaded = useSelector((state) => state.events.eventIds.length > 0);
	const isEventDeleted = eventsLoaded && !currentEvent;
	const isEventArchived =
		currentEvent?.status === 0 || currentEvent?.status === "0";

	// Check if payments addon is active and event requires registration
	const hasPaymentsAddon =
		typeof window.simplyconf?.components?.payments?.RegistrationForm !==
		"undefined";
	const requiresRegistration =
		currentEvent?.requires_reg_fee === 1 ||
		currentEvent?.requires_reg_fee === "1" ||
		currentEvent?.requires_reg_fee === true;

	// Build tab items dynamically with terminology
	const tabItems = useMemo(() => {
		const items = allMenuItems.map((item) => {
			let entity = item.key;
			const count = 2; // Default to plural
			let useTerminology = true;

			// Map menu keys to terminology entities
			switch (item.key) {
				case "dashboard":
					useTerminology = false; // Dashboard doesn't use terminology
					break;
				case "submissions":
					entity = "abstract";
					break;
				case "reviews":
					entity = "review";
					break;
				case "tracks":
					entity = "track";
					break;
			}

			const labelText = useTerminology
				? getTerm(entity, count)
				: __("Dashboard", "simplyconf");

			return {
				...item,
				label: labelText,
			};
		});

		// Add conference registration tab if enabled
		if (requiresRegistration && hasPaymentsAddon) {
			// Check registration status
			const registrationHelper = window.simplyconf?.utils?.registration;
			const registrationStatus = registrationHelper?.getStatus();
			const isPaid = registrationStatus?.is_paid;

			items.push({
				key: "conference-registration",
				icon: <CreditCardOutlined />,
				label: (
					<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						{getTerm("registration", 1)}
						{registrationStatus && (
							<Badge status={isPaid ? "success" : "warning"} dot />
						)}
					</span>
				),
				roles: ["author", "reviewer", "track_chair", "viewer"],
			});
		}

		return items;
	}, [getTerm, requiresRegistration, hasPaymentsAddon]);

	const filteredTabItems = useMemo(
		() =>
			tabItems.filter((item) =>
				item.roles.some((role) => roles.includes(role)),
			),
		[tabItems, roles],
	);

	// Determine the default landing page based on user roles (priority-based)
	const getDefaultRoute = useCallback(() => {
		// Find the first matching role in priority order
		for (const { role, route } of ROLE_LANDING_PRIORITY) {
			if (roles.includes(role)) {
				// Verify the route is available in filtered tab items
				const tabItem = filteredTabItems.find((item) => item.key === route);
				if (tabItem) {
					return route;
				}
			}
		}
		// Fallback to first available tab item
		return filteredTabItems.length > 0 ? filteredTabItems[0].key : null;
	}, [roles, filteredTabItems]);

	useEffect(() => {
		const path = location.pathname.replace("/", "");
		if (path) {
			// User is on a specific path, just update the tab
			setCurrentTab(path);
		} else {
			// User is on root path, navigate to their default landing page
			const defaultRoute = getDefaultRoute();
			if (defaultRoute) {
				navigate(defaultRoute, { replace: true });
				setCurrentTab(defaultRoute);
			}
		}
	}, [location, getDefaultRoute, navigate]);

	// Check if we're on the register route
	const isRegisterRoute =
		location.pathname === "/register" || location.hash === "#/register";

	// Show loading spinner while checking session
	if (loading || !sessionChecked) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16 }}>{__("Loading...", "simplyconf")}</div>
			</div>
		);
	}

	// Don't render until we have the locale loaded
	if (!antdLocale) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16 }}>{__("Loading...", "simplyconf")}</div>
			</div>
		);
	}

	// Allow access to register route even when not authenticated
	if (!isAuthenticated && !isRegisterRoute) {
		return (
			<Login
				onLogin={() => {
					// Re-check session after login by incrementing trigger
					setSessionChecked(false);
					setSessionCheckTrigger((prev) => prev + 1);
				}}
			/>
		);
	}

	// If on register route and not authenticated, just show the outlet (Register component)
	if (!isAuthenticated && isRegisterRoute) {
		return <Outlet />;
	}

	const handleLogout = async () => {
		try {
			// First dispatch logout to clear server session
			await dispatch(logout());
			// Clear local auth state
			dispatch(clearAuth());
			// Reset local component state
			setRoles([]);
			// Keep sessionChecked true so we don't show loading spinner
			// isAuthenticated being false will show the login form
			setSessionChecked(true);
			setLoading(false);
			// Navigate to root to show login page
			navigate("/", { replace: true });
		} catch (error) {
			console.error("[Frontend] Logout error:", error);
			// Even on error, clear local state to show login
			dispatch(clearAuth());
			setRoles([]);
			setSessionChecked(true);
			setLoading(false);
			navigate("/", { replace: true });
		}
	};

	// User dropdown menu items
	const userMenuItems = [
		{
			key: "profile",
			icon: <UserOutlined />,
			label: <Link to="profile">{__("My Profile", "simplyconf")}</Link>,
		},
		{
			type: "divider",
		},
		{
			key: "logout",
			icon: <LogoutOutlined />,
			label: __("Logout", "simplyconf"),
			onClick: handleLogout,
			danger: true,
		},
	];

	return (
		<ConfigProvider locale={antdLocale} direction={direction} prefixCls="sc">
			<div className="simplyconf-frontend-table">
				{/* Header with Tabs and User Menu */}
				<div
					style={{
						backgroundColor: "#fff",
						boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
						position: "sticky",
						top: 0,
						zIndex: 1000,
						marginBottom: "24px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "24px",
						}}
					>
						{/* Mobile Menu Button */}
						<Button
							type="text"
							icon={<MenuOutlined />}
							onClick={() => setMobileMenuOpen(true)}
							className="mobile-menu-button"
							style={{
								fontSize: "20px",
								padding: "8px",
								display: "none",
							}}
						/>

						{/* Tabs Navigation */}
						<Tabs
							activeKey={currentTab}
							onChange={(key) => {
								setCurrentTab(key);
								navigate(key);
							}}
							items={filteredTabItems}
							className="frontend-nav-tabs"
							style={{
								flex: 1,
								marginBottom: 0,
							}}
						/>

						{/* User Menu */}
						<Dropdown
							menu={{ items: userMenuItems }}
							trigger={["click"]}
							placement="bottomRight"
						>
							<Button
								type="text"
								style={{
									height: "auto",
									padding: "8px 12px",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<UserOutlined style={{ color: "#1890ff" }} />
								<Space className="user-menu-text">
									<Typography.Text strong>
										{user?.display_name || user?.user_email || "User"}
									</Typography.Text>
									<DownOutlined style={{ fontSize: "10px", color: "#666" }} />
								</Space>
							</Button>
						</Dropdown>
					</div>
				</div>

				{/* Mobile Drawer */}
				<Drawer
					title={
						<Typography.Title level={5} style={{ margin: 0, color: "#1890ff" }}>
							{currentEvent?.name || __("Menu", "simplyconf")}
						</Typography.Title>
					}
					placement="left"
					onClose={() => setMobileMenuOpen(false)}
					open={mobileMenuOpen}
					width={280}
				>
					<Menu
						onClick={(e) => {
							setCurrentTab(e.key);
							navigate(e.key);
							setMobileMenuOpen(false);
						}}
						selectedKeys={[currentTab]}
						mode="vertical"
						items={filteredTabItems}
						style={{
							border: "none",
							fontSize: "15px",
							fontWeight: 500,
						}}
					/>
				</Drawer>

				{/* Main Content */}
				<div style={{ padding: "0" }}>
					{isEventDeleted ? (
						<Alert
							type="error"
							showIcon
							message={__("Event Not Found", "simplyconf")}
							description={__(
								"This event is no longer available. It may have been removed by an administrator.",
								"simplyconf",
							)}
							style={{ margin: "24px 0" }}
						/>
					) : (
						<>
							{isEventArchived && (
								<Alert
									type="warning"
									showIcon
									banner
									message={__(
										"This event is archived. Submissions are closed.",
										"simplyconf",
									)}
									style={{ marginBottom: "16px" }}
								/>
							)}
							<Outlet />
						</>
					)}
				</div>

				{/* Floating Admin Button — show if user has administrator WP role */}
				{(user?.wp_roles?.includes("administrator") ||
					user?.roles?.includes("administrator") ||
					window.simplyconf?.isAdmin === "true") && (
					<a
						href={
							window.simplyconf?.adminUrl ||
							`${window.location.origin}/wp-admin/admin.php?page=simplyconf`
						}
						title={__("Go to Admin", "simplyconf")}
						style={{
							position: "fixed",
							bottom: 24,
							right: 24,
							zIndex: 9999,
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "10px 18px 10px 14px",
							background: "#41618d",
							color: "#fff",
							textDecoration: "none",
							fontSize: 14,
							fontWeight: 600,
							borderRadius: 50,
							boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
							transition:
								"background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "#2A3F5C";
							e.currentTarget.style.boxShadow =
								"0 6px 20px rgba(0, 0, 0, 0.25)";
							e.currentTarget.style.transform = "translateY(-1px)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "#41618d";
							e.currentTarget.style.boxShadow =
								"0 4px 14px rgba(0, 0, 0, 0.18)";
							e.currentTarget.style.transform = "translateY(0)";
						}}
					>
						<SettingOutlined />
						{__("Admin", "simplyconf")}
					</a>
				)}
			</div>
		</ConfigProvider>
	);
};

export default Frontend;
