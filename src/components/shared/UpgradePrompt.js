import { LockOutlined, StarFilled } from "@ant-design/icons";
import { useIsSaas } from "@hooks/useFeature";
import { getAddon } from "@utils/addons";
import { __ } from "@wordpress/i18n";
import { Button, Card, Typography } from "antd";
import PropTypes from "prop-types";

const { Title, Paragraph } = Typography;

const UpgradePrompt = ({ feature = "this feature", addonSlug = null }) => {
	const isSaas = useIsSaas();

	// Check if addon is installed/active (self-hosted only)
	const addonData = !isSaas && addonSlug ? getAddon(addonSlug) : null;
	const isAddonInstalled = addonData !== null;

	// SaaS mode: Link to WP Ultimo account page
	const saasUpgradeUrl = "/wp-admin/admin.php?page=account";

	// Self-hosted mode: Link based on whether addon is installed
	const selfHostedUpgradeUrl = isAddonInstalled
		? "#/settings/licenses"
		: "https://www.simplyconf.com/addons/";

	const upgradeUrl = isSaas ? saasUpgradeUrl : selfHostedUpgradeUrl;

	// Determine messaging based on mode and addon status
	let title;
	let message;
	let description;
	let buttonText;

	if (isSaas) {
		title = __("Feature Not Available", "simplyconf");
		message = __("is not included in your current plan.", "simplyconf");
		description = __(
			"Upgrade your plan to unlock advanced features like Reviews, Emails, Schedules, Payments, and more.",
			"simplyconf",
		);
		buttonText = __("Upgrade Plan", "simplyconf");
	} else if (isAddonInstalled) {
		// Addon is installed but license is missing/invalid/expired
		title = __("License Required", "simplyconf");
		message = __("requires an active license to use.", "simplyconf");
		description = __(
			"Activate or renew your license to access this feature. If you don't have a license yet, you can purchase one from our website.",
			"simplyconf",
		);
		buttonText = __("Manage Licenses", "simplyconf");
	} else {
		// Addon is not installed at all
		title = __("Add-On Required", "simplyconf");
		message = __("requires a separate add-on to be installed.", "simplyconf");
		description = __(
			"Purchase and install the add-on to unlock this feature and enhance your conference management capabilities.",
			"simplyconf",
		);
		buttonText = __("Browse Add-Ons", "simplyconf");
	}

	return (
		<Card
			style={{ maxWidth: 620, margin: "40px auto", textAlign: "center" }}
			bordered
		>
			<LockOutlined
				style={{ fontSize: 48, color: "#faad14", marginBottom: 16 }}
			/>
			<Title level={3}>{title}</Title>
			<Paragraph>
				<StarFilled style={{ color: "#faad14" }} /> <b>{feature}</b> {message}
			</Paragraph>
			<Paragraph>{description}</Paragraph>
			<Button
				type="primary"
				size="large"
				href={upgradeUrl}
				target={!isAddonInstalled ? "_blank" : "_self"}
				rel={isSaas ? undefined : "noopener noreferrer"}
			>
				{buttonText}
			</Button>
		</Card>
	);
};

UpgradePrompt.propTypes = {
	feature: PropTypes.string,
	addonSlug: PropTypes.string,
};

export default UpgradePrompt;
