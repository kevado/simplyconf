import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { getSettings, updateSettingsBatch } from "@state/settingSlice";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Col,
	Collapse,
	Form,
	Input,
	InputNumber,
	Row,
	Select,
	Space,
	Spin,
	Switch,
	Typography,
} from "antd";
import { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;
const { Option } = Select;

// Custom form components that connect to Form context
const CaptchaSettingsPanel = ({ form }) => {
	const captchaEnabled = Form.useWatch("enable_captcha", form);

	return (
		<Row gutter={[24, 16]}>
			<Col xs={24} md={12}>
				<Card key="enable_captcha" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Enable reCAPTCHA v3", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Protect login and registration forms with Google reCAPTCHA v3",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="enable_captcha"
								valuePropName="checked"
								style={{ marginBottom: 0 }}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			{captchaEnabled && (
				<>
					<Col xs={24} md={12}>
						<Card key="recaptcha_site_key" className="simplyconf-settings-card">
							<div style={{ marginBottom: 8 }}>
								<Text strong>{__("reCAPTCHA Site Key", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__("From Google reCAPTCHA admin console", "simplyconf")}
									</Text>
								</div>
							</div>
							<Form.Item name="recaptcha_site_key" style={{ marginBottom: 0 }}>
								<Input placeholder="6Lc..." />
							</Form.Item>
						</Card>
					</Col>
					<Col xs={24} md={12}>
						<Card
							key="recaptcha_secret_key"
							className="simplyconf-settings-card"
						>
							<div style={{ marginBottom: 8 }}>
								<Text strong>{__("reCAPTCHA Secret Key", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Server-side key — never exposed to visitors",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
							<Form.Item
								name="recaptcha_secret_key"
								style={{ marginBottom: 0 }}
							>
								<Input.Password placeholder="6Lc..." />
							</Form.Item>
						</Card>
					</Col>
				</>
			)}
		</Row>
	);
};

const RegistrationSettingsPanel = () => (
	<>
		<Row gutter={[24, 16]}>
			<Col xs={24} md={12}>
				<Card
					key="enable_user_registration"
					className="simplyconf-settings-card"
				>
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Enable User Registration", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Allow new users to register for accounts on your event",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="enable_user_registration"
								valuePropName="checked"
								style={{ marginBottom: 0 }}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card key="login_redirect" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Login Redirect URL", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"URL where users are redirected after successful login",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "200px" }}>
							<Form.Item name="login_redirect" style={{ marginBottom: 0 }}>
								<Input
									placeholder={__("e.g., /dashboard or /profile", "simplyconf")}
								/>
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
		</Row>
	</>
);

const PasswordSettingsPanel = () => (
	<>
		<Row gutter={[24, 16]}>
			<Col xs={24} md={12}>
				<Card key="password_min_length" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Minimum Password Length", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Minimum number of characters required for passwords",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="password_min_length" style={{ marginBottom: 0 }}>
								<InputNumber min={6} max={255} style={{ width: "100%" }} />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card key="password_max_length" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Maximum Password Length", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Maximum number of characters allowed for passwords",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="password_max_length" style={{ marginBottom: 0 }}>
								<InputNumber min={8} max={255} style={{ width: "100%" }} />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card
					key="password_require_uppercase"
					className="simplyconf-settings-card"
				>
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Require Uppercase Letters", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Passwords must contain at least one uppercase letter (A-Z)",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="password_require_uppercase"
								valuePropName="checked"
								style={{ marginBottom: 0 }}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card
					key="password_require_lowercase"
					className="simplyconf-settings-card"
				>
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Require Lowercase Letters", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Passwords must contain at least one lowercase letter (a-z)",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="password_require_lowercase"
								valuePropName="checked"
								style={{ marginBottom: 0 }}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card
					key="password_require_numbers"
					className="simplyconf-settings-card"
				>
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Require Numbers", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Passwords must contain at least one number (0-9)",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="password_require_numbers"
								valuePropName="checked"
								style={{ marginBottom: 0 }}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card
					key="password_require_special"
					className="simplyconf-settings-card"
				>
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Require Special Characters", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Passwords must contain at least one special character (!@#$%^&*)",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="password_require_special"
								valuePropName="checked"
								style={{ marginBottom: 0 }}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
		</Row>
	</>
);

const AdvancedSettingsPanel = () => (
	<>
		<Row gutter={[24, 16]}>
			<Col xs={24}>
				<Text type="secondary">
					{__(
						"Additional user settings will be available here in future updates. Current settings focus on registration security and password policies.",
						"simplyconf",
					)}
				</Text>
			</Col>
		</Row>
	</>
);

const UserSettings = () => {
	const [form] = Form.useForm();
	const [saving, setSaving] = useState(false);
	const dispatch = useDispatch();

	const settings = useSelector(
		(state) => state.settings.settings.user || [],
		shallowEqual,
	);
	const isLoading = useSelector((state) => state.settings.isLoading);
	const eventId = useSelector((state) => state.events.globalId);

	// Define collapse items with custom components
	const collapseItems = [
		{
			key: "1",
			label: __("Registration Settings", "simplyconf"),
			children: <RegistrationSettingsPanel />,
		},
		{
			key: "2",
			label: __("Password Requirements", "simplyconf"),
			children: <PasswordSettingsPanel />,
		},
		{
			key: "3",
			label: __("reCAPTCHA Settings", "simplyconf"),
			children: <CaptchaSettingsPanel form={form} />,
		},
		{
			key: "4",
			label: __("Advanced Settings", "simplyconf"),
			children: <AdvancedSettingsPanel />,
		},
	];

	useEffect(() => {
		if (eventId && eventId > 0) {
			dispatch(getSettings(eventId));
		}
	}, [dispatch, eventId]);

	// Set form values when settings load
	useEffect(() => {
		if (settings.length > 0) {
			const processedSettings = {};

			settings.forEach((setting) => {
				let value = setting.value;
				// Convert values from database format to form format
				if (setting.type === "boolean") {
					value = Number.parseInt(value, 10) === 1;
				} else if (setting.type === "number") {
					value = Number.parseInt(value, 10) || 0;
				}
				processedSettings[setting.name] = value;
			});

			form.setFieldsValue(processedSettings);
		}
	}, [settings, form]);

	const handleSave = async (values) => {
		setSaving(true);

		try {
			// Prepare batch update payload
			const updates = [];

			for (const [settingName, value] of Object.entries(values)) {
				const setting = settings.find((s) => s.name === settingName);

				if (setting) {
					// Convert values to appropriate database format
					let dbValue = value;
					if (typeof value === "boolean") {
						dbValue = value ? 1 : 0;
					} else if (typeof value === "number") {
						dbValue = value.toString();
					} else if (setting.type === "number") {
						// Handle InputNumber values that come as strings
						dbValue = Number.parseInt(value, 10) || 0;
					}

					updates.push({
						settingId: setting.setting_id,
						value: dbValue.toString(),
					});
				} else {
					console.warn(`Setting not found for: ${settingName}`);
				}
			}

			// Send all updates in a single batch request
			await dispatch(
				updateSettingsBatch({ settingsUpdates: updates, eventId }),
			).unwrap();

			showSuccess(__("Settings saved successfully!", "simplyconf"));
		} catch (error) {
			console.error("Failed to save settings:", error);
			showError(__("Failed to save settings. Please try again.", "simplyconf"));
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		if (eventId) {
			dispatch(getSettings(eventId));
		}
		showWarning(__("Settings reset to saved values.", "simplyconf"));
	};

	if (isLoading) {
		return (
			<Spin
				size="large"
				style={{ display: "block", textAlign: "center", padding: "50px" }}
			/>
		);
	}

	return (
		<Space direction="vertical" size="middle" style={{ display: "flex" }}>
			<div className="simplyconf-page-header">
				<Title level={3} style={{ margin: 0, color: "#fff" }}>
					{__("User Settings", "simplyconf")}
				</Title>
				<Text style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px" }}>
					{__(
						"Configure user registration, login, and password requirements for this event.",
						"simplyconf",
					)}
				</Text>
			</div>

			<Form
				form={form}
				layout="vertical"
				onFinish={handleSave}
				style={{ marginTop: 24 }}
			>
				<Collapse
					items={collapseItems}
					defaultActiveKey={["1", "2", "3", "4"]}
					className="simplyconf-settings-collapse"
				/>

				<div style={{ textAlign: "center" }}>
					<Space size="large">
						<Button
							type="default"
							icon={<ReloadOutlined />}
							onClick={handleReset}
							disabled={saving}
						>
							{__("Reset to Saved", "simplyconf")}
						</Button>
						<Button
							type="primary"
							icon={<SaveOutlined />}
							htmlType="submit"
							loading={saving}
							size="large"
						>
							{__("Save Settings", "simplyconf")}
						</Button>
					</Space>
				</div>
			</Form>
		</Space>
	);
};

export default UserSettings;
