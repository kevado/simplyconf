import {
	CalendarOutlined,
	TagsOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import { __ } from "@wordpress/i18n";
import { Button, Space, Typography, theme } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Title } = Typography;

const EventsWrapper = () => {
	const { token } = theme.useToken();
	const { getTerm } = useTerminology();
	const location = useLocation();
	const navigate = useNavigate();

	// Determine current section based on route
	const getCurrentSection = () => {
		const path = location.pathname;
		if (path.includes("/events/tracks")) return "tracks";
		if (path.includes("/events/statuses")) return "statuses";
		return "events"; // default
	};

	const isEvents = getCurrentSection() === "events";
	const isTracks = getCurrentSection() === "tracks";
	const isStatuses = getCurrentSection() === "statuses";

	const getPageTitle = () => {
		switch (getCurrentSection()) {
			case "tracks":
				return getTerm("track", 2);
			case "statuses":
				return __("Status Management", "simplyconf");
			default:
				return __("Events", "simplyconf");
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
							type={isEvents ? "primary" : "default"}
							icon={<CalendarOutlined />}
							onClick={() => navigate("/events")}
							size="large"
						>
							{__("Events", "simplyconf")}
						</Button>
						<Button
							type={isTracks ? "primary" : "default"}
							icon={<UnorderedListOutlined />}
							onClick={() => navigate("/events/tracks")}
							size="large"
						>
							{getTerm("track", 2)}
						</Button>
						<Button
							type={isStatuses ? "primary" : "default"}
							icon={<TagsOutlined />}
							onClick={() => navigate("/events/statuses")}
							size="large"
						>
							{__("Statuses", "simplyconf")}
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

export default EventsWrapper;
