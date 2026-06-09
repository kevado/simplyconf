import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { getSettings, updateSettingsBatch } from "@state/settingSlice";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Checkbox,
	Col,
	Collapse,
	Form,
	InputNumber,
	Radio,
	Row,
	Select,
	Space,
	Spin,
	Switch,
	Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;
const { Option } = Select;

// Custom form components that connect to Form context
const AbstractSettingsPanel = () => (
	<>
		<Row gutter={[24, 16]}>
			<Col xs={24} md={12}>
				<Card key="show_description" className="simplyconf-settings-card">
					<Row
						justify="space-between"
						align="middle"
						style={{ marginBottom: 0 }}
					>
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Enable Abstract Description", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Allow users to enter a description/abstract content",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="show_description"
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
				<Card key="editor_media" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Enable Rich Text Editor", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Allow rich text formatting in abstract descriptions",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="editor_media"
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
				<Card key="chars_count" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Character Count Limit", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Maximum number of characters allowed in abstract description",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="chars_count" style={{ marginBottom: 0 }}>
								<InputNumber min={50} max={5000} style={{ width: "100%" }} />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card key="submit_limit" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Submission Limit per User", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Maximum number of abstracts a single user can submit",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="submit_limit" style={{ marginBottom: 0 }}>
								<InputNumber style={{ width: "100%" }} />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24}>
				<Card key="submission_mode" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<Text strong>{__("Submission Mode", "simplyconf")}</Text>
							<div>
								<Text type="secondary" style={{ fontSize: "12px" }}>
									{__("Choose how users submit abstracts", "simplyconf")}
								</Text>
							</div>
						</Col>
						<Col>
							<Form.Item name="submission_mode" style={{ marginBottom: 0 }}>
								<Radio.Group>
									<Radio value="wizard">
										{__("Multi-Step Wizard", "simplyconf")}
									</Radio>
									<Radio value="single_page">
										{__("Single Page", "simplyconf")}
									</Radio>
								</Radio.Group>
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
		</Row>
	</>
);

const AuthorSettingsPanel = () => (
	<>
		<Row gutter={[24, 16]}>
			<Col xs={24} md={12}>
				<Card key="show_author" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Show Author Information", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Display author names and affiliations in abstract listings",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="show_author"
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
					key="auto_link_authors_to_users"
					className="simplyconf-settings-card"
				>
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>
									{__("Auto-link Authors to Users", "simplyconf")}
								</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Automatically link authors to existing WordPress users based on email",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="auto_link_authors_to_users"
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

const AttachmentSettingsPanel = () => (
	<>
		<Row gutter={[24, 16]}>
			<Col xs={24} md={12}>
				<Card key="show_attachments" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Enable Attachments", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Allow users to upload files with their submissions",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col>
							<Form.Item
								name="show_attachments"
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
				<Card key="attachment_pref" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Attachment Preference", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Set whether file uploads are optional or required",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="attachment_pref" style={{ marginBottom: 0 }}>
								<Select>
									<Option value="optional">
										{__("Optional", "simplyconf")}
									</Option>
									<Option value="required">
										{__("Required", "simplyconf")}
									</Option>
								</Select>
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card key="upload_limit" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Upload Limit", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Maximum number of files allowed per submission",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="upload_limit" style={{ marginBottom: 0 }}>
								<InputNumber min={1} max={10} style={{ width: "100%" }} />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24} md={12}>
				<Card key="max_attach_size" className="simplyconf-settings-card">
					<Row justify="space-between" align="middle">
						<Col flex="auto">
							<div>
								<Text strong>{__("Maximum File Size (MB)", "simplyconf")}</Text>
								<div>
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{__(
											"Maximum size for each uploaded file in megabytes",
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						</Col>
						<Col style={{ minWidth: "150px" }}>
							<Form.Item name="max_attach_size" style={{ marginBottom: 0 }}>
								<InputNumber min={1} max={100} style={{ width: "100%" }} />
							</Form.Item>
						</Col>
					</Row>
				</Card>
			</Col>
			<Col xs={24}>
				<Form.Item
					name="allowed_file_types"
					label={__("Allowed File Types", "simplyconf")}
					tooltip={__("Select which file types users can upload", "simplyconf")}
				>
					<Checkbox.Group style={{ width: "100%" }}>
						<Row>
							<Col xs={24} sm={12} md={8}>
								<Checkbox value="pdf">{__("PDF", "simplyconf")}</Checkbox>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Checkbox value="doc">
									{__("Word (DOC/DOCX)", "simplyconf")}
								</Checkbox>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Checkbox value="ppt">
									{__("PowerPoint (PPT/PPTX)", "simplyconf")}
								</Checkbox>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Checkbox value="xls">
									{__("Excel (XLS/XLSX)", "simplyconf")}
								</Checkbox>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Checkbox value="jpg">
									{__("JPEG Images", "simplyconf")}
								</Checkbox>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Checkbox value="png">
									{__("PNG Images", "simplyconf")}
								</Checkbox>
							</Col>
						</Row>
					</Checkbox.Group>
				</Form.Item>
			</Col>
		</Row>
	</>
);

const AbstractsSettings = () => {
	const [form] = Form.useForm();
	const [saving, setSaving] = useState(false);
	const dispatch = useDispatch();

	const settings = useSelector(
		(state) => state.settings.settings.abstract || [],
		shallowEqual,
	);
	const authorSettings = useSelector(
		(state) => state.settings.settings.author || [],
		shallowEqual,
	);
	const isLoading = useSelector((state) => state.settings.isLoading);

	const eventId = useSelector((state) => state.events.globalId);

	// Define collapse items with custom components - memoized to prevent recreation
	const collapseItems = useMemo(
		() => [
			{
				key: "1",
				label: __("📝 Abstract Settings", "simplyconf"),
				children: <AbstractSettingsPanel />,
			},
			{
				key: "2",
				label: __("👥 Author Settings", "simplyconf"),
				children: <AuthorSettingsPanel />,
			},
			{
				key: "3",
				label: __("📎 Attachment Settings", "simplyconf"),
				children: <AttachmentSettingsPanel />,
			},
		],
		[],
	);

	useEffect(() => {
		if (eventId) {
			dispatch(getSettings(eventId));
		}
	}, [dispatch, eventId]);

	// Set form values when settings load
	useEffect(() => {
		if (settings.length > 0 || authorSettings.length > 0) {
			// Process abstract settings
			const processedSettings = {};
			settings.forEach((setting) => {
				let value = setting.value;
				// Handle different data types
				if (setting.type === "boolean") {
					value = Number.parseInt(value, 10) === 1;
				} else if (setting.type === "number") {
					value = Number.parseInt(value, 10) || 0;
				} else if (
					setting.name === "allowed_file_types" &&
					typeof value === "string"
				) {
					// Parse JSON array for allowed_file_types
					try {
						value = JSON.parse(value);
					} catch (_e) {
						value = [];
					}
				}
				processedSettings[setting.name] = value;
			});

			// Process author settings
			authorSettings.forEach((setting) => {
				let value = setting.value;
				// Handle different data types
				if (setting.type === "boolean") {
					value = Number.parseInt(value, 10) === 1;
				} else if (setting.type === "number") {
					value = Number.parseInt(value, 10) || 0;
				}
				processedSettings[setting.name] = value;
			});

			form.setFieldsValue(processedSettings);
		}
	}, [settings, authorSettings, form]);

	const handleSave = async (values) => {
		setSaving(true);

		try {
			// Prepare batch update payload
			const updates = [];

			for (const [settingName, value] of Object.entries(values)) {
				// Check both abstract and author settings
				let setting = settings.find((s) => s.name === settingName);
				if (!setting) {
					setting = authorSettings.find((s) => s.name === settingName);
				}

				if (setting) {
					// Convert values for database storage
					let dbValue = value;
					if (typeof value === "boolean") {
						// Convert boolean values to 1/0
						dbValue = value ? 1 : 0;
					} else if (Array.isArray(value)) {
						// Convert arrays to JSON string
						dbValue = JSON.stringify(value);
					} else {
						// Convert other values to string
						dbValue = dbValue.toString();
					}

					updates.push({
						settingId: setting.setting_id,
						value: dbValue,
					});
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
					{__("Abstract Settings", "simplyconf")}
				</Title>
				<Text style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px" }}>
					{__(
						"Configure abstract submissions, author requirements, and attachment settings for this event",
						"simplyconf",
					)}
				</Text>
			</div>

			<div style={{ marginTop: 24 }}>
				<Form
					form={form}
					layout="vertical"
					onFinish={handleSave}
					style={{ marginTop: 24 }}
				>
					<Collapse
						items={collapseItems}
						defaultActiveKey={["1", "2", "3"]}
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
			</div>
		</Space>
	);
};

export default AbstractsSettings;
