import {
	DownloadOutlined,
	ExclamationCircleOutlined,
	SaveOutlined,
	UndoOutlined,
	UploadOutlined as UploadIcon,
	UploadOutlined,
} from "@ant-design/icons";
import StyledModal from "@shared/StyledModal";
import {
	applyLocalSettings,
	clearAppearanceError,
	fetchAppearanceSettings,
	fetchThemePresets,
	selectAppearanceError,
	selectAppearanceErrorMessage,
	selectAppearanceLoading,
	selectAppearanceSettings,
	selectAppearanceUpdating,
	selectThemePresets,
	updateAppearanceSettings,
} from "@state/appearanceSlice";
import { injectThemeVariables } from "@utils/cssVariables";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Button,
	Card,
	Col,
	Collapse,
	ColorPicker,
	Form,
	Input,
	Row,
	Select,
	Slider,
	Space,
	Spin,
	Typography,
	theme,
	Upload,
} from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Access WordPress media library from window
const wp = window.wp;

const Appearance = () => {
	const { token } = theme.useToken();
	const dispatch = useDispatch();
	const [form] = Form.useForm();

	const settings = useSelector(selectAppearanceSettings);
	const loading = useSelector(selectAppearanceLoading);
	const updating = useSelector(selectAppearanceUpdating);
	const presets = useSelector(selectThemePresets);
	const error = useSelector(selectAppearanceError);
	const errorMessage = useSelector(selectAppearanceErrorMessage);

	// Local state for preset selection
	const [selectedPreset, setSelectedPreset] = useState("default");
	const [currentPreset, setCurrentPreset] = useState("default");
	const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
	const [pendingPreset, setPendingPreset] = useState(null);
	const [isResetModalOpen, setIsResetModalOpen] = useState(false);

	useEffect(() => {
		dispatch(fetchAppearanceSettings());
		dispatch(fetchThemePresets());
	}, [dispatch]);

	useEffect(() => {
		if (settings) {
			form.setFieldsValue(settings);
			// Use the preset field from settings, default to 'custom' if not set
			const activePreset = settings.preset || "custom";
			setCurrentPreset(activePreset);
			setSelectedPreset(activePreset);
		}
	}, [settings, form]);

	useEffect(() => {
		if (error) {
			showError(errorMessage);
			dispatch(clearAppearanceError());
		}
	}, [error, errorMessage, dispatch]);

	const handleSave = async (values) => {
		try {
			// Include the current preset in the saved settings
			const settingsWithPreset = {
				...values,
				preset: currentPreset,
			};

			await dispatch(updateAppearanceSettings(settingsWithPreset)).unwrap();

			// Re-inject CSS variables to apply theme changes immediately
			injectThemeVariables(settingsWithPreset);

			showSuccess(__("Theme settings saved successfully!", "simplyconf"));
		} catch (_error) {
			showError(__("Failed to save theme settings", "simplyconf"));
		}
	};

	const handlePresetChange = (presetName) => {
		// Show confirmation modal before applying preset
		setPendingPreset(presetName);
		setIsPresetModalOpen(true);
	};

	const applyPreset = async () => {
		if (presets?.[pendingPreset]) {
			const presetSettings = {
				...presets[pendingPreset],
				preset: pendingPreset, // Store which preset was applied
			};
			form.setFieldsValue(presetSettings);
			setCurrentPreset(pendingPreset);
			setSelectedPreset(pendingPreset);
			setIsPresetModalOpen(false);

			// Apply theme immediately in Redux + CSS
			dispatch(applyLocalSettings(presetSettings));
			injectThemeVariables(presetSettings);

			// Persist to server automatically
			try {
				await dispatch(updateAppearanceSettings(presetSettings)).unwrap();
				showSuccess(__("Preset applied and saved", "simplyconf"));
			} catch {
				showError(__("Preset applied but failed to save", "simplyconf"));
			}
		}
	};

	const cancelPresetChange = () => {
		setSelectedPreset(currentPreset);
		setIsPresetModalOpen(false);
		setPendingPreset(null);
	};

	const handleResetToDefaults = () => {
		setIsResetModalOpen(true);
	};

	const cancelResetChange = () => {
		setIsResetModalOpen(false);
	};

	const confirmResetToDefaults = async () => {
		// Get default preset settings
		if (presets?.default) {
			const defaultSettings = {
				...presets.default,
				preset: "default", // Store that default preset was applied
			};
			form.setFieldsValue(defaultSettings);
			setCurrentPreset("default");
			setSelectedPreset("default");
			setIsResetModalOpen(false);

			// Apply theme immediately in Redux + CSS
			dispatch(applyLocalSettings(defaultSettings));
			injectThemeVariables(defaultSettings);

			// Persist to server automatically
			try {
				await dispatch(updateAppearanceSettings(defaultSettings)).unwrap();
				showSuccess(
					__("Settings reset to factory defaults and saved", "simplyconf"),
				);
			} catch {
				showError(__("Settings reset but failed to save", "simplyconf"));
			}
		}
	};

	// Helper function to handle color changes
	const handleColorChange = (colorType) => (color) => {
		form.setFieldsValue({
			colors: {
				...form.getFieldValue("colors"),
				[colorType]: color.toHexString(),
			},
		});
		// Mark as custom when user manually changes colors
		setCurrentPreset("custom");
		setSelectedPreset("custom");
	};

	const handleExportSettings = () => {
		const settings = form.getFieldsValue();
		const dataStr = JSON.stringify(settings, null, 2);
		const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
		const exportFileDefaultName = "theme-settings.json";
		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", dataUri);
		linkElement.setAttribute("download", exportFileDefaultName);
		linkElement.click();
		showSuccess(__("Settings exported successfully", "simplyconf"));
	};

	const handleMediaLibraryUpload = () => {
		// Open WordPress Media Library
		if (wp?.media) {
			const mediaUploader = wp.media({
				title: __("Select Logo", "simplyconf"),
				button: {
					text: __("Use this image", "simplyconf"),
				},
				multiple: false,
				library: {
					type: "image",
				},
			});

			mediaUploader.on("select", () => {
				const attachment = mediaUploader
					.state()
					.get("selection")
					.first()
					.toJSON();
				const currentValues = form.getFieldsValue();
				form.setFieldsValue({
					...currentValues,
					branding: {
						...currentValues.branding,
						logo_url: attachment.url,
					},
				});
				showSuccess(__("Logo uploaded successfully", "simplyconf"));
			});

			mediaUploader.open();
		} else {
			showError(__("WordPress Media Library not available", "simplyconf"));
		}
	};

	const handleImportSettings = (file) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const importedSettings = JSON.parse(e.target.result);
				form.setFieldsValue(importedSettings);
				showSuccess(__("Settings imported successfully", "simplyconf"));
			} catch (_error) {
				showError(
					__("Invalid JSON file. Please check the file format.", "simplyconf"),
				);
			}
		};
		reader.readAsText(file);
		return false; // Prevent default upload behavior
	};

	if (loading) {
		return (
			<div style={{ textAlign: "center", padding: "50px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16 }}>
					{__("Loading theme settings...", "simplyconf")}
				</div>
			</div>
		);
	}

	return (
		<Space direction="vertical" size="middle" style={{ display: "flex" }}>
			{/* Page Header */}
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Title level={3} style={{ margin: 0, color: "#fff" }}>
							{__("Theme Customization", "simplyconf")}
						</Title>
						<Text
							style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px" }}
						>
							{__(
								"Customize colors, typography, and layout for your conference site",
								"simplyconf",
							)}
						</Text>
					</Col>
					<Col>
						<Space>
							<Select
								value={selectedPreset}
								onChange={handlePresetChange}
								placeholder={__("Select Preset", "simplyconf")}
								style={{ width: 150 }}
							>
								{Object.keys(presets || {}).map((preset) => (
									<Option key={preset} value={preset}>
										{preset.charAt(0).toUpperCase() + preset.slice(1)}
									</Option>
								))}
								{selectedPreset === "custom" && (
									<Option key="custom" value="custom" disabled>
										Custom
									</Option>
								)}
							</Select>
							<Upload
								beforeUpload={handleImportSettings}
								showUploadList={false}
								accept=".json"
							>
								<Button icon={<UploadIcon />}>
									{__("Import", "simplyconf")}
								</Button>
							</Upload>
							<Button
								icon={<DownloadOutlined />}
								onClick={handleExportSettings}
							>
								{__("Export", "simplyconf")}
							</Button>
							<Button icon={<UndoOutlined />} onClick={handleResetToDefaults}>
								{__("Reset", "simplyconf")}
							</Button>
							<Button
								type="primary"
								icon={<SaveOutlined />}
								loading={updating}
								onClick={() => form.submit()}
							>
								{__("Save Changes", "simplyconf")}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>

			<Form
				form={form}
				layout="vertical"
				onFinish={handleSave}
				initialValues={settings}
			>
				<Collapse
					defaultActiveKey={["1", "2", "3", "4"]}
					className="simplyconf-settings-collapse"
					items={[
						{
							key: "1",
							label: __("🎨 Branding & Organization", "simplyconf"),
							children: (
								<Row gutter={[24, 24]}>
									<Col xs={24} lg={12}>
										<Card title={__("Organization Details", "simplyconf")}>
											<Form.Item
												label={__("Organization Name", "simplyconf")}
												name={["branding", "organization_name"]}
												rules={[
													{
														max: 100,
														message: __(
															"Organization name must be less than 100 characters",
															"simplyconf",
														),
													},
												]}
											>
												<Input
													placeholder={__(
														"Your Organization Name",
														"simplyconf",
													)}
												/>
											</Form.Item>

											<Form.Item
												label={__("Logo URL", "simplyconf")}
												name={["branding", "logo_url"]}
												extra={__(
													"Upload or enter the URL of your organization logo",
													"simplyconf",
												)}
												rules={[
													{
														type: "url",
														message: __(
															"Please enter a valid URL",
															"simplyconf",
														),
													},
												]}
											>
												<Input placeholder="https://example.com/logo.png" />
											</Form.Item>

											<Form.Item label={__("Upload Logo", "simplyconf")}>
												<Button
													icon={<UploadOutlined />}
													onClick={handleMediaLibraryUpload}
												>
													{__("Select from Media Library", "simplyconf")}
												</Button>
											</Form.Item>
										</Card>
									</Col>

									<Col xs={24} lg={12}>
										<Card
											title={__("Logo Preview", "simplyconf")}
											style={{ height: "100%" }}
										>
											{form.getFieldValue(["branding", "logo_url"]) ? (
												<div style={{ textAlign: "center", padding: "24px" }}>
													<img
														src={form.getFieldValue(["branding", "logo_url"])}
														alt={__("Logo Preview", "simplyconf")}
														style={{ maxWidth: "200px", maxHeight: "100px" }}
													/>
												</div>
											) : (
												<Alert
													message={__("No Logo Set", "simplyconf")}
													description={__(
														"Upload or enter a logo URL to see preview",
														"simplyconf",
													)}
													type="info"
													showIcon
												/>
											)}
										</Card>
									</Col>
								</Row>
							),
						},
						{
							key: "2",
							label: __("🎨 Color Scheme", "simplyconf"),
							children: (
								<Row gutter={[24, 24]}>
									<Col xs={24} md={12} lg={6}>
										<Card title={__("Primary Color", "simplyconf")}>
											<Form.Item name={["colors", "primary"]}>
												<ColorPicker
													showText
													onChange={handleColorChange("primary")}
												/>
											</Form.Item>
										</Card>
									</Col>

									<Col xs={24} md={12} lg={6}>
										<Card title={__("Success Color", "simplyconf")}>
											<Form.Item name={["colors", "success"]}>
												<ColorPicker
													showText
													onChange={handleColorChange("success")}
												/>
											</Form.Item>
										</Card>
									</Col>

									<Col xs={24} md={12} lg={6}>
										<Card title={__("Warning Color", "simplyconf")}>
											<Form.Item name={["colors", "warning"]}>
												<ColorPicker
													showText
													onChange={handleColorChange("warning")}
												/>
											</Form.Item>
										</Card>
									</Col>

									<Col xs={24} md={12} lg={6}>
										<Card title={__("Error Color", "simplyconf")}>
											<Form.Item name={["colors", "error"]}>
												<ColorPicker
													showText
													onChange={handleColorChange("error")}
												/>
											</Form.Item>
										</Card>
									</Col>
								</Row>
							),
						},
						{
							key: "3",
							label: __("📝 Typography", "simplyconf"),
							children: (
								<Row gutter={[24, 24]}>
									<Col xs={24} lg={12}>
										<Card title={__("Font Settings", "simplyconf")}>
											<Form.Item
												label={__("Font Family", "simplyconf")}
												name={["typography", "fontFamily"]}
											>
												<Select
													placeholder={__("Select font family", "simplyconf")}
												>
													<Option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
														{__("System Default", "simplyconf")}
													</Option>
													<Option value="'Arial', sans-serif">
														{__("Arial", "simplyconf")}
													</Option>
													<Option value="'Helvetica', sans-serif">
														{__("Helvetica", "simplyconf")}
													</Option>
													<Option value="'Times New Roman', serif">
														{__("Times New Roman", "simplyconf")}
													</Option>
													<Option value="'Georgia', serif">
														{__("Georgia", "simplyconf")}
													</Option>
													<Option value="'Courier New', monospace">
														{__("Courier New", "simplyconf")}
													</Option>
												</Select>
											</Form.Item>

											<Form.Item
												label={__("Base Font Size", "simplyconf")}
												name={["typography", "baseFontSize"]}
												rules={[
													{
														type: "number",
														min: 12,
														max: 18,
														message: __(
															"Font size must be between 12 and 18 pixels",
															"simplyconf",
														),
													},
												]}
											>
												<Slider
													min={12}
													max={18}
													marks={{
														12: __("12px", "simplyconf"),
														14: __("14px", "simplyconf"),
														16: __("16px", "simplyconf"),
														18: __("18px", "simplyconf"),
													}}
												/>
											</Form.Item>

											<Form.Item
												label={__("Font Weight", "simplyconf")}
												name={["typography", "fontWeight"]}
												initialValue={400}
											>
												<Slider
													min={300}
													max={900}
													step={100}
													marks={{
														300: "300",
														400: "400",
														500: "500",
														600: "600",
														700: "700",
														800: "800",
														900: "900",
													}}
												/>
											</Form.Item>

											<Form.Item
												label={__("Line Height", "simplyconf")}
												name={["typography", "lineHeight"]}
												initialValue={1.5}
											>
												<Slider
													min={1.2}
													max={2.0}
													step={0.1}
													marks={{
														1.2: "1.2",
														1.5: "1.5",
														1.8: "1.8",
														2.0: "2.0",
													}}
												/>
											</Form.Item>

											<Form.Item
												label={__("Letter Spacing (px)", "simplyconf")}
												name={["typography", "letterSpacing"]}
												initialValue={0}
											>
												<Slider
													min={-2}
													max={4}
													step={0.5}
													marks={{
														"-2": "-2",
														0: "0",
														2: "2",
														4: "4",
													}}
												/>
											</Form.Item>
										</Card>
									</Col>

									<Col xs={24} lg={12}>
										<Card
											title={__("Typography Preview", "simplyconf")}
											style={{ height: "100%" }}
										>
											<div
												style={{
													fontFamily: form.getFieldValue([
														"typography",
														"fontFamily",
													]),
													fontSize:
														form.getFieldValue([
															"typography",
															"baseFontSize",
														]) || 14,
													fontWeight:
														form.getFieldValue(["typography", "fontWeight"]) ||
														400,
													lineHeight:
														form.getFieldValue(["typography", "lineHeight"]) ||
														1.5,
													letterSpacing: `${
														form.getFieldValue([
															"typography",
															"letterSpacing",
														]) || 0
													}px`,
													padding: "16px",
													border: "1px solid #f0f0f0",
													borderRadius: "8px",
												}}
											>
												<Title level={3}>
													{__("Sample Heading", "simplyconf")}
												</Title>
												<Paragraph>
													{__(
														"This is a sample paragraph showing how your typography settings will look. The quick brown fox jumps over the lazy dog.",
														"simplyconf",
													)}
												</Paragraph>
												<Text strong>
													{__("Sample bold text", "simplyconf")}
												</Text>
												<br />
												<Text type="secondary">
													{__("Sample secondary text", "simplyconf")}
												</Text>
											</div>
										</Card>
									</Col>
								</Row>
							),
						},
						{
							key: "4",
							label: __("⚙️ Layout & Spacing", "simplyconf"),
							children: (
								<Row gutter={[24, 24]}>
									<Col xs={24} lg={12}>
										<Card title={__("Layout Settings", "simplyconf")}>
											<Form.Item
												label={__("Border Radius", "simplyconf")}
												name={["layout", "borderRadius"]}
											>
												<Slider
													min={0}
													max={16}
													marks={{
														0: __("0px", "simplyconf"),
														4: __("4px", "simplyconf"),
														8: __("8px", "simplyconf"),
														12: __("12px", "simplyconf"),
														16: __("16px", "simplyconf"),
													}}
												/>
											</Form.Item>

											<Form.Item
												label={__("Shadow Intensity", "simplyconf")}
												name={["layout", "shadowIntensity"]}
											>
												<Select
													placeholder={__(
														"Select shadow intensity",
														"simplyconf",
													)}
												>
													<Option value="none">
														{__("None", "simplyconf")}
													</Option>
													<Option value="light">
														{__("Light", "simplyconf")}
													</Option>
													<Option value="medium">
														{__("Medium", "simplyconf")}
													</Option>
													<Option value="strong">
														{__("Strong", "simplyconf")}
													</Option>
												</Select>
											</Form.Item>

											<Form.Item
												label={__("Custom CSS", "simplyconf")}
												name={["layout", "customCSS"]}
												extra={__(
													"Add custom CSS to override theme styles. Use with caution.",
													"simplyconf",
												)}
											>
												<Input.TextArea
													rows={6}
													placeholder="/* Your custom CSS here */"
													style={{ fontFamily: "monospace" }}
												/>
											</Form.Item>
										</Card>
									</Col>

									<Col xs={24} lg={12}>
										<Card title={__("Layout Preview", "simplyconf")}>
											<div
												style={{
													padding: "20px",
													borderRadius:
														form.getFieldValue(["layout", "borderRadius"]) || 8,
													boxShadow:
														form.getFieldValue([
															"layout",
															"shadowIntensity",
														]) === "none"
															? "none"
															: form.getFieldValue([
																		"layout",
																		"shadowIntensity",
																	]) === "light"
																? "0 2px 8px rgba(0,0,0,0.1)"
																: form.getFieldValue([
																			"layout",
																			"shadowIntensity",
																		]) === "medium"
																	? "0 4px 12px rgba(0,0,0,0.15)"
																	: "0 8px 24px rgba(0,0,0,0.2)",
													border: "1px solid #f0f0f0",
												}}
											>
												<Title level={4}>
													{__("Sample Card", "simplyconf")}
												</Title>
												<Paragraph>
													{__(
														"This card demonstrates your layout settings including border radius and shadow intensity.",
														"simplyconf",
													)}
												</Paragraph>
											</div>
										</Card>
									</Col>
								</Row>
							),
						},
					]}
				/>
			</Form>

			{/* Preset Confirmation Modal */}
			<StyledModal
				title={__("Apply Theme Preset?", "simplyconf")}
				titleIcon={<ExclamationCircleOutlined />}
				open={isPresetModalOpen}
				onOk={applyPreset}
				onCancel={cancelPresetChange}
				okText={__("Apply & Save", "simplyconf")}
				cancelText={__("Cancel", "simplyconf")}
				okButtonProps={{ loading: updating }}
			>
				<p>
					<strong>
						{__("Preset:", "simplyconf")}{" "}
						{pendingPreset &&
							pendingPreset.charAt(0).toUpperCase() + pendingPreset.slice(1)}
					</strong>
				</p>
				<Alert
					message={__(
						"Applying this preset will override your current theme settings. Any unsaved changes will be lost.",
						"simplyconf",
					)}
					description={__(
						"You can export your current settings before applying a preset to restore them for later.",
						"simplyconf",
					)}
					type="warning"
					showIcon
				/>
			</StyledModal>

			{/* Reset to Defaults Confirmation Modal */}
			<StyledModal
				title={__("Reset to Factory Defaults?", "simplyconf")}
				titleIcon={<ExclamationCircleOutlined />}
				open={isResetModalOpen}
				onOk={confirmResetToDefaults}
				onCancel={cancelResetChange}
				okText={__("Reset & Save", "simplyconf")}
				cancelText={__("Cancel", "simplyconf")}
				okButtonProps={{ danger: true, loading: updating }}
			>
				<Alert
					message={__("Warning", "simplyconf")}
					description={__(
						"This will reset ALL theme settings to factory defaults. Any custom configurations will be lost. This action cannot be undone.",
						"simplyconf",
					)}
					type="warning"
					showIcon
					style={{ marginBottom: 16 }}
				/>
				<p>
					{__(
						"We recommend exporting your current settings before resetting, so you can restore them later if needed.",
						"simplyconf",
					)}
				</p>
			</StyledModal>
		</Space>
	);
};

export default Appearance;
