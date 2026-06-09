import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	ReloadOutlined,
	SafetyCertificateOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import LicenseService from "@services/licenses";
import { fetchEnabledFeatures } from "@state/featureSlice";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Button,
	Card,
	Col,
	Descriptions,
	Divider,
	Form,
	Input,
	Row,
	Space,
	Spin,
	Tag,
	Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

const { Title, Text, Paragraph } = Typography;

const Licenses = () => {
	const dispatch = useDispatch();
	const [licenses, setLicenses] = useState({});
	const [loading, setLoading] = useState({});
	const [initialLoading, setInitialLoading] = useState(true);
	const isSaas = window.simplyconf?.isSaas === "true";

	useEffect(() => {
		if (!isSaas) {
			fetchAllLicenses();
		} else {
			setInitialLoading(false);
		}
	}, [isSaas, fetchAllLicenses]);

	const fetchAllLicenses = async () => {
		setInitialLoading(true);
		try {
			const response = await LicenseService.getAllStatus();
			setLicenses(response.licenses);
		} catch (_error) {
			showError(__("Failed to load license information", "simplyconf"));
		} finally {
			setInitialLoading(false);
		}
	};

	const refetchFeatures = async () => {
		// Dispatch Redux action to fetch and update features
		dispatch(fetchEnabledFeatures());
	};

	const handleActivate = async (addon, values) => {
		setLoading({ ...loading, [addon]: true });

		try {
			const response = await LicenseService.activate(addon, values.license_key);

			if (response.success) {
				showSuccess(response.message);
				fetchAllLicenses();
				// Refetch enabled features to update UI
				await refetchFeatures();
			} else {
				showError(response.message);
			}
		} catch (error) {
			showError(
				error.response?.data?.message || __("Activation failed", "simplyconf"),
			);
		} finally {
			setLoading({ ...loading, [addon]: false });
		}
	};

	const handleDeactivate = async (addon) => {
		setLoading({ ...loading, [addon]: true });

		try {
			const response = await LicenseService.deactivate(addon);

			if (response.success) {
				showSuccess(response.message);
				fetchAllLicenses();
				// Refetch enabled features to update UI
				await refetchFeatures();
			} else {
				showError(response.message);
			}
		} catch (_error) {
			showError(__("Deactivation failed", "simplyconf"));
		} finally {
			setLoading({ ...loading, [addon]: false });
		}
	};

	const handleValidate = async (addon) => {
		setLoading({ ...loading, [`${addon}_validate`]: true });

		try {
			const response = await LicenseService.validate(addon);

			if (response.valid) {
				showSuccess(__("License validated successfully", "simplyconf"));
			} else {
				showWarning(
					response.message || __("License validation failed", "simplyconf"),
				);
			}

			fetchAllLicenses();
		} catch (_error) {
			showError(__("Validation failed", "simplyconf"));
		} finally {
			setLoading({ ...loading, [`${addon}_validate`]: false });
		}
	};

	const getStatusTag = (status) => {
		const statusMap = {
			valid: {
				color: "success",
				icon: <CheckCircleOutlined />,
				text: __("Active", "simplyconf"),
			},
			active: {
				color: "success",
				icon: <CheckCircleOutlined />,
				text: __("Active", "simplyconf"),
			},
			expired: {
				color: "error",
				icon: <CloseCircleOutlined />,
				text: __("Expired", "simplyconf"),
			},
			suspended: {
				color: "error",
				icon: <CloseCircleOutlined />,
				text: __("Suspended", "simplyconf"),
			},
			invalid: {
				color: "error",
				icon: <CloseCircleOutlined />,
				text: __("Invalid", "simplyconf"),
			},
			deactivated: {
				color: "default",
				icon: <WarningOutlined />,
				text: __("Deactivated", "simplyconf"),
			},
			inactive: {
				color: "default",
				icon: <WarningOutlined />,
				text: __("No License", "simplyconf"),
			},
		};

		const config = statusMap[status] || statusMap.inactive;

		return (
			<Tag color={config.color} icon={config.icon}>
				{config.text}
			</Tag>
		);
	};

	const renderAddonLicense = (addon, title) => {
		const license = licenses[addon];

		if (!license) return null;

		return (
			<Card
				title={
					<Space>
						<SafetyCertificateOutlined />
						{title}
					</Space>
				}
				style={{ height: "100%" }}
				styles={{ body: { display: "flex", flexDirection: "column" } }}
			>
				{license.has_license ? (
					<>
						<Descriptions column={1} bordered size="small">
							<Descriptions.Item label={__("Status", "simplyconf")}>
								{getStatusTag(license.status)}
							</Descriptions.Item>
							<Descriptions.Item label={__("License Key", "simplyconf")}>
								<Text code>{license.license_key}</Text>
							</Descriptions.Item>
							{license.expires && (
								<Descriptions.Item label={__("Expires", "simplyconf")}>
									{new Date(license.expires).toLocaleDateString()}
								</Descriptions.Item>
							)}
							<Descriptions.Item label={__("Activations", "simplyconf")}>
								{license.activations} / {license.max_activations}
							</Descriptions.Item>
							{license.activated_at && (
								<Descriptions.Item label={__("Activated", "simplyconf")}>
									{new Date(license.activated_at).toLocaleString()}
								</Descriptions.Item>
							)}
							{license.last_checked && (
								<Descriptions.Item label={__("Last Checked", "simplyconf")}>
									{new Date(license.last_checked).toLocaleString()}
								</Descriptions.Item>
							)}
						</Descriptions>

						<Space style={{ marginTop: 16 }}>
							<Button
								danger
								onClick={() => handleDeactivate(addon)}
								loading={loading[addon]}
							>
								{__("Deactivate License", "simplyconf")}
							</Button>
							<Button
								icon={<ReloadOutlined />}
								onClick={() => handleValidate(addon)}
								loading={loading[`${addon}_validate`]}
							>
								{__("Validate Now", "simplyconf")}
							</Button>
						</Space>

						{license.status === "expired" && (
							<Alert
								message={__("License Expired", "simplyconf")}
								description={
									<span>
										{__("Your license has expired. Please", "simplyconf")}{" "}
										<a
											href={`https://simplyconf.com/account/renew?license=${license.license_key}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											{__("renew your license", "simplyconf")}
										</a>{" "}
										{__(
											"to continue receiving updates and support.",
											"simplyconf",
										)}
									</span>
								}
								type="warning"
								showIcon
								style={{ marginTop: 16 }}
							/>
						)}
					</>
				) : (
					<>
						<Paragraph type="secondary">
							{__(
								"Activate your license key to receive updates, support, and access to premium features.",
								"simplyconf",
							)}
						</Paragraph>

						<Form onFinish={(values) => handleActivate(addon, values)}>
							<Form.Item
								name="license_key"
								label={__("License Key", "simplyconf")}
								rules={[
									{
										required: true,
										message: __("Please enter your license key", "simplyconf"),
									},
									{
										pattern: /^[a-f0-9]{32}$/i,
										message: __(
											"Invalid license key format. Please enter a valid 32-character license key.",
											"simplyconf",
										),
									},
								]}
							>
								<Input
									placeholder={__(
										"Enter your license key from simplyconf.com",
										"simplyconf",
									)}
								/>
							</Form.Item>

							<Form.Item>
								<Button
									type="primary"
									htmlType="submit"
									loading={loading[addon]}
								>
									{__("Activate License", "simplyconf")}
								</Button>
							</Form.Item>
						</Form>

						<Alert
							message={__("Don't have a license?", "simplyconf")}
							description={
								<span>
									{__("Purchase a license for this add-on at", "simplyconf")}{" "}
									<a
										href="https://simplyconf.com/pricing"
										target="_blank"
										rel="noopener noreferrer"
									>
										simplyconf.com/pricing
									</a>
								</span>
							}
							type="info"
							showIcon
						/>
					</>
				)}
			</Card>
		);
	};

	if (initialLoading) {
		return (
			<div style={{ padding: 24, textAlign: "center" }}>
				<Spin size="large" />
			</div>
		);
	}

	if (isSaas) {
		return (
			<div style={{ padding: 24, maxWidth: 1600 }}>
				<Title level={2}>{__("License Management", "simplyconf")}</Title>
				<Card>
					<Alert
						message={__("SaaS Mode Active", "simplyconf")}
						description={__(
							"License management is not available in SaaS mode. All premium features are automatically included with your subscription.",
							"simplyconf",
						)}
						type="info"
						showIcon
						icon={<SafetyCertificateOutlined />}
					/>
				</Card>
			</div>
		);
	}

	return (
		<div style={{ padding: 24, maxWidth: 1600 }}>
			<Title level={2}>{__("License Management", "simplyconf")}</Title>
			<Paragraph>
				{__(
					"Manage your SimplyConf add-on licenses. Each add-on requires a separate license key for updates and support.",
					"simplyconf",
				)}
			</Paragraph>

			<Divider />

			<Row gutter={[24, 24]}>
				{["reviews", "emails", "payments", "schedules", "exports"]
					.filter((slug) => licenses[slug]) // Only show addons that exist
					.map((addonSlug) => {
						// Convert slug to title (e.g., 'reviews' -> 'Reviews Add-On')
						const addonTitle =
							licenses[addonSlug]?.addon ||
							`${addonSlug.charAt(0).toUpperCase() + addonSlug.slice(1)} Add-On`;

						return (
							<Col xs={24} lg={12} key={addonSlug}>
								{renderAddonLicense(addonSlug, addonTitle)}
							</Col>
						);
					})}
			</Row>

			<Card style={{ marginTop: 24, background: "#f5f5f5" }}>
				<Title level={4}>{__("License Information", "simplyconf")}</Title>
				<Paragraph>
					<ul>
						<li>
							{__(
								"Licenses are validated automatically every 24 hours",
								"simplyconf",
							)}
						</li>
						<li>
							{__(
								"You can deactivate and transfer licenses between sites",
								"simplyconf",
							)}
						</li>
						<li>
							{__("Contact support for license-related issues", "simplyconf")}
						</li>
					</ul>
				</Paragraph>
			</Card>
		</div>
	);
};

export default Licenses;
