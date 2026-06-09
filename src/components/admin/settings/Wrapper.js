import {
	BgColorsOutlined,
	SafetyCertificateOutlined,
	TagsOutlined,
} from "@ant-design/icons";
import { __ } from "@wordpress/i18n";
import { Button, Space, Typography, theme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Title } = Typography;

const SettingsWrapper = () => {
	const { token } = theme.useToken();
	const location = useLocation();
	const navigate = useNavigate();

	const getCurrentSection = () => {
		const path = location.pathname;
		if (path.includes("/settings/terminology")) return "terminology";
		if (path.includes("/settings/licenses")) return "licenses";
		return "appearance";
	};

	const isAppearance = getCurrentSection() === "appearance";
	const isTerminology = getCurrentSection() === "terminology";
	const isLicenses = getCurrentSection() === "licenses";

	const getPageTitle = () => {
		switch (getCurrentSection()) {
			case "terminology":
				return __("Terminology Settings", "simplyconf");
			case "licenses":
				return __("Licenses", "simplyconf");
			default:
				return __("Appearance Settings", "simplyconf");
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
							type={isAppearance ? "primary" : "default"}
							icon={<BgColorsOutlined />}
							onClick={() => navigate("/settings")}
							size="large"
						>
							{__("Appearance", "simplyconf")}
						</Button>
						<Button
							type={isTerminology ? "primary" : "default"}
							icon={<TagsOutlined />}
							onClick={() => navigate("/settings/terminology")}
							size="large"
						>
							{__("Terminology", "simplyconf")}
						</Button>
						<Button
							type={isLicenses ? "primary" : "default"}
							icon={<SafetyCertificateOutlined />}
							onClick={() => navigate("/settings/licenses")}
							size="large"
						>
							{__("Licenses", "simplyconf")}
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

export default SettingsWrapper;
