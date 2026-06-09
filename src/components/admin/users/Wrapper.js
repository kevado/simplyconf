import { FormOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import { __ } from "@wordpress/i18n";
import { Button, Space, Typography, theme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Title } = Typography;

const UsersWrapper = () => {
	const { token } = theme.useToken();
	const { getTerm } = useTerminology();
	const location = useLocation();
	const navigate = useNavigate();

	// Determine current section based on route
	const getCurrentSection = () => {
		const path = location.pathname;
		if (path.includes("/users/settings")) return "settings";
		if (path.includes("/users/customfields")) return "customfields";
		return "users"; // default
	};

	const isUsers = getCurrentSection() === "users";
	const isSettings = getCurrentSection() === "settings";
	const isCustomFields = getCurrentSection() === "customfields";

	const getPageTitle = () => {
		switch (getCurrentSection()) {
			case "settings":
				return __("User Settings", "simplyconf");
			case "customfields":
				return __("User Custom Fields", "simplyconf");
			default:
				return getTerm("user", 2);
		}
	};

	return (
		<div className="simplyconf-wrapper-container">
			<div className="simplyconf-wrapper-header">
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<Title level={2} style={{ margin: 0, color: token.colorPrimary }}>
						{getPageTitle()}
					</Title>
					<Space size="middle">
						<Button
							type={isUsers ? "primary" : "default"}
							icon={<UserOutlined />}
							onClick={() => navigate("/users")}
							size="large"
						>
							{getTerm("user", 2)}
						</Button>
						<Button
							type={isCustomFields ? "primary" : "default"}
							icon={<FormOutlined />}
							onClick={() => navigate("/users/customfields")}
							size="large"
						>
							{__("Custom Fields", "simplyconf")}
						</Button>
						<Button
							type={isSettings ? "primary" : "default"}
							icon={<SettingOutlined />}
							onClick={() => navigate("/users/settings")}
							size="large"
						>
							{__("Settings", "simplyconf")}
						</Button>
					</Space>
				</div>
			</div>

			<div className="simplyconf-wrapper-content">
				<Outlet />
			</div>
		</div>
	);
};

export default UsersWrapper;
