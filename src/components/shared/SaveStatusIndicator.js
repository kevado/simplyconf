import {
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import { __ } from "@wordpress/i18n";
import { Space, Typography } from "antd";
import { formatDistanceToNow } from "date-fns";
import PropTypes from "prop-types";

const SaveStatusIndicator = ({ status, lastSaved }) => {
	const getIcon = () => {
		switch (status) {
			case "saving":
				return <SyncOutlined spin style={{ color: "#1890ff" }} />;
			case "saved":
				return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
			case "error":
				return <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />;
			default:
				return null;
		}
	};

	const getText = () => {
		switch (status) {
			case "saving":
				return __("Saving...", "simplyconf");
			case "saved":
				return lastSaved
					? `${__("Saved", "simplyconf")} ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
					: __("Saved", "simplyconf");
			case "error":
				return __("Failed to save - Click to retry", "simplyconf");
			default:
				return "";
		}
	};

	return (
		<Space>
			{getIcon()}
			<Typography.Text type={status === "error" ? "danger" : "secondary"}>
				{getText()}
			</Typography.Text>
		</Space>
	);
};

SaveStatusIndicator.propTypes = {
	status: PropTypes.oneOf(["saving", "saved", "error"]).isRequired,
	lastSaved: PropTypes.instanceOf(Date),
};

export default SaveStatusIndicator;
