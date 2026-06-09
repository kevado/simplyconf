import {
	FileOutlined,
	FormOutlined,
	SettingOutlined,
	TableOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import { __ } from "@wordpress/i18n";
import { Button, Space, Typography, theme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { sprintf } from "sprintf-js";

const { Title } = Typography;

const AbstractsWrapper = () => {
	const { token } = theme.useToken();
	const location = useLocation();
	const navigate = useNavigate();

	const { getTerm } = useTerminology();

	// Determine current section based on route
	const getCurrentSection = () => {
		const path = location.pathname;
		if (path.includes("/abstracts/settings")) return "settings";
		if (path.includes("/abstracts/customfields")) return "customfields";
		if (path.includes("/abstracts/authors")) return "authors";
		if (path.includes("/abstracts/attachments")) return "attachments";
		return "submissions"; // default
	};

	const isSubmissions = getCurrentSection() === "submissions";
	const isSettings = getCurrentSection() === "settings";
	const isCustomFields = getCurrentSection() === "customfields";
	const isAuthors = getCurrentSection() === "authors";
	const isAttachments = getCurrentSection() === "attachments";

	const getPageTitle = () => {
		switch (getCurrentSection()) {
			case "settings":
				return sprintf(__("%s Settings", "simplyconf"), getTerm("abstract", 1));
			case "customfields":
				return __("Custom Fields", "simplyconf");
			case "authors":
				return getTerm("author", 2);
			case "attachments":
				return __("Attachments", "simplyconf");
			default:
				return getTerm("abstract", 2);
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
							type={isSubmissions ? "primary" : "default"}
							icon={<TableOutlined />}
							onClick={() => navigate("/abstracts")}
							size="large"
							data-testid="nav-submissions"
						>
							{getTerm("abstract", 2)}
						</Button>
						<Button
							type={isAuthors ? "primary" : "default"}
							icon={<UserOutlined />}
							onClick={() => navigate("/abstracts/authors")}
							size="large"
							data-testid="nav-authors"
						>
							{getTerm("author", 2)}
						</Button>
						<Button
							type={isAttachments ? "primary" : "default"}
							icon={<FileOutlined />}
							onClick={() => navigate("/abstracts/attachments")}
							size="large"
							data-testid="nav-attachments"
						>
							{__("Attachments", "simplyconf")}
						</Button>
						<Button
							type={isCustomFields ? "primary" : "default"}
							icon={<FormOutlined />}
							onClick={() => navigate("/abstracts/customfields")}
							size="large"
							data-testid="nav-customfields"
						>
							{__("Custom Fields", "simplyconf")}
						</Button>
						<Button
							type={isSettings ? "primary" : "default"}
							icon={<SettingOutlined />}
							onClick={() => navigate("/abstracts/settings")}
							size="large"
							data-testid="nav-settings"
						>
							{__("Settings", "simplyconf")}
						</Button>
					</Space>
				</div>
			</div>

			{/* Content Area */}
			<div className="simplyconf-wrapper-content">
				<Outlet />
			</div>
		</div>
	);
};

export default AbstractsWrapper;
