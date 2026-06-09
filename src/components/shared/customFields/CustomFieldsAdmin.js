import {
	BranchesOutlined,
	DeleteOutlined,
	EditOutlined,
	MoreOutlined,
	PlusOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import StyledModal from "@shared/StyledModal";
import {
	bulkDeleteCustomFields,
	createCustomField,
	deleteCustomField,
	fetchCustomFields,
	selectCustomFieldsByUsage,
	updateCustomField,
} from "@state/customFieldsSlice";
import { showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Col,
	Dropdown,
	Form,
	Input,
	Modal,
	Popconfirm,
	Row,
	Select,
	Space,
	Switch,
	Table,
	Tabs,
	Tooltip,
	Typography,
} from "antd";
import PropTypes from "prop-types";
/* eslint-disable no-mixed-spaces-and-tabs */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Title } = Typography;

const { Option } = Select;

const CustomFieldsAdmin = ({ eventId, usage = "abstract", title }) => {
	const displayTitle = title || __("Custom Fields", "simplyconf");

	const fieldTypes = [
		// Basic input types
		{ value: "text", label: __("Text Input", "simplyconf") },
		{ value: "textarea", label: __("Text Area", "simplyconf") },
		{ value: "email", label: __("Email", "simplyconf") },
		{ value: "number", label: __("Number", "simplyconf") },

		// Selection types
		{ value: "select", label: __("Dropdown Select", "simplyconf") },
		{ value: "radio", label: __("Radio Buttons", "simplyconf") },
		{ value: "checkbox", label: __("Checkbox", "simplyconf") },

		// Rating type
		{ value: "rating", label: __("Star Rating (1-5)", "simplyconf") },

		// File upload type
		{ value: "file_upload", label: __("File Upload", "simplyconf") },
	];
	const dispatch = useDispatch();
	const fields = useSelector((state) =>
		selectCustomFieldsByUsage(state, usage),
	);
	const loading = useSelector((state) => state.customFields.isLoading[usage]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);
	const [form] = Form.useForm();

	// Get available fields for conditional logic (same event_id and usage, excluding current field)
	const availableFields = fields.filter(
		(f) => !editing || f.field_id !== editing.field_id,
	);

	useEffect(() => {
		dispatch(fetchCustomFields({ event_id: eventId, usage }));
	}, [dispatch, eventId, usage]);

	const handleEdit = (field) => {
		setEditing(field);
		setIsModalOpen(true);

		// Parse conditional logic JSON if it exists
		let conditionalLogic = {};
		if (field.conditional_logic) {
			try {
				conditionalLogic = JSON.parse(field.conditional_logic);
			} catch (e) {
				console.error("Invalid conditional logic JSON:", e);
			}
		}

		form.setFieldsValue({
			...field,
			required: !!field.required,
			show_in_admin: field.show_in_admin !== 0,
			show_in_frontend: field.show_in_frontend !== 0,
			show_in_registration: field.show_in_registration !== 0,
			conditional_enabled: conditionalLogic.enabled || false,
			conditional_action: conditionalLogic.action || "show",
			conditional_logic: conditionalLogic.logic || "all",
			conditional_rules: conditionalLogic.rules || [],
		});
	};

	const handleDelete = (field) => {
		dispatch(
			deleteCustomField({ field_id: field.field_id, event_id: eventId, usage }),
		)
			.unwrap()
			.then(() => showSuccess(__("Field deleted", "simplyconf")));
	};

	const handleBulkDelete = () => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: __("Delete Custom Fields", "simplyconf"),
			content: __(
				"Are you sure you want to delete selected field(s)? This action cannot be undone.",
				"simplyconf",
			),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					const result = await dispatch(
						bulkDeleteCustomFields({
							field_ids: selectedRowKeys,
							event_id: eventId,
							usage,
						}),
					).unwrap();
					showSuccess(
						// Translators: %d: number of fields deleted
						__("%d field(s) deleted successfully", "simplyconf").replace(
							"%d",
							result.count,
						),
					);
					setSelectedRowKeys([]);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showSuccess(
						__(
							"Some fields could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	const handleAdd = () => {
		setEditing(null);
		setIsModalOpen(true);
		form.resetFields();
	};

	const handleSave = async () => {
		const values = await form.validateFields();

		// Build conditional logic JSON
		let conditionalLogic = null;
		if (values.conditional_enabled) {
			conditionalLogic = JSON.stringify({
				enabled: true,
				action: values.conditional_action,
				rules: values.conditional_rules || [],
				logic: values.conditional_logic,
			});
		}

		// Remove conditional logic fields from values before saving
		const {
			conditional_enabled,
			conditional_action,
			conditional_rules,
			conditional_logic,
			...cleanValues
		} = values;

		const payload = {
			...cleanValues,
			event_id: eventId,
			usage,
			conditional_logic: conditionalLogic,
		};

		if (editing) {
			await dispatch(
				updateCustomField({
					field_id: editing.field_id,
					data: payload,
				}),
			)
				.unwrap()
				.then(() => {
					setIsModalOpen(false);
					showSuccess(__("Field updated", "simplyconf"));
				});
		} else {
			await dispatch(createCustomField(payload))
				.unwrap()
				.then(() => {
					setIsModalOpen(false);
					showSuccess(__("Field created", "simplyconf"));
				});
		}
		setIsModalOpen(false);
	};

	const rowSelection = {
		selectedRowKeys,
		onChange: (selectedKeys) => {
			setSelectedRowKeys(selectedKeys);
		},
	};

	const columns = [
		{ title: __("Label", "simplyconf"), dataIndex: "label", key: "label" },
		{ title: __("Name", "simplyconf"), dataIndex: "name", key: "name" },
		{ title: __("Type", "simplyconf"), dataIndex: "type", key: "type" },
		{
			title: __("Conditional", "simplyconf"),
			dataIndex: "conditional_logic",
			key: "conditional_logic",
			width: 100,
			render: (conditionalLogic) => {
				if (!conditionalLogic) return null;
				try {
					const logic = JSON.parse(conditionalLogic);
					if (logic.enabled) {
						return (
							<Tooltip
								title={__("This field has conditional logic", "simplyconf")}
							>
								<BranchesOutlined style={{ color: "#1890ff" }} />
							</Tooltip>
						);
					}
				} catch (_e) {
					// Invalid JSON
				}
				return null;
			},
		},
		{
			title: __("Required", "simplyconf"),
			dataIndex: "required",
			key: "required",
			render: (val) => (val ? __("Yes", "simplyconf") : __("No", "simplyconf")),
		},
		{
			title: __("Show in Admin Table", "simplyconf"),
			dataIndex: "show_in_admin",
			key: "show_in_admin",
			render: (val) => (val ? __("Yes", "simplyconf") : __("No", "simplyconf")),
		},
		{
			title: __("Show in Frontend Table", "simplyconf"),
			dataIndex: "show_in_frontend",
			key: "show_in_frontend",
			render: (val) => (val ? __("Yes", "simplyconf") : __("No", "simplyconf")),
		},
		...(usage === "user"
			? [
					{
						title: __("Show in Registration", "simplyconf"),
						dataIndex: "show_in_registration",
						key: "show_in_registration",
						render: (val) =>
							val ? __("Yes", "simplyconf") : __("No", "simplyconf"),
					},
				]
			: []),
		{
			title: __("Order", "simplyconf"),
			dataIndex: "order_num",
			key: "order_num",
		},
		{
			title: __("Actions", "simplyconf"),
			key: "actions",
			width: 80,
			render: (_, field) => {
				const menuItems = [
					{
						key: "edit",
						icon: <EditOutlined />,
						label: __("Edit Field", "simplyconf"),
						onClick: () => handleEdit(field),
					},
					{
						key: "delete",
						icon: <DeleteOutlined />,
						label: (
							<Popconfirm
								placement="topRight"
								title={__("Confirmation", "simplyconf")}
								description={__(
									"Are you sure you want to delete this field?",
									"simplyconf",
								)}
								okText={__("Delete", "simplyconf")}
								cancelText={__("Cancel", "simplyconf")}
								onConfirm={() => handleDelete(field)}
								onCancel={(e) => e.stopPropagation()}
							>
								<span
									type="text"
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									{__("Delete Field", "simplyconf")}
								</span>
							</Popconfirm>
						),
						danger: true,
					},
				];

				return (
					<Dropdown menu={{ items: menuItems }} placement="left">
						<Button>
							<SettingOutlined />
						</Button>
					</Dropdown>
				);
			},
		},
	];

	return (
		<div style={{ padding: "0px" }}>
			{/* Header Section */}
			<div className="simplyconf-page-header">
				<Row justify="space-between" align="middle">
					<Col>
						<Title
							level={3}
							style={{
								margin: 0,
								color: "#fff",
								fontWeight: 600,
							}}
						>
							{displayTitle}
						</Title>
					</Col>
					<Col>
						<Space>
							{selectedRowKeys.length > 0 && (
								<Dropdown
									menu={{
										items: [
											{
												key: "bulk_delete",
												label: __("Delete Selected", "simplyconf"),
												icon: <DeleteOutlined />,
												danger: true,
												onClick: handleBulkDelete,
											},
										],
									}}
									placement="bottomRight"
								>
									<Button className="simplyconf-bulk-actions-btn">
										{__("Bulk Actions", "simplyconf")} ({selectedRowKeys.length}
										) <MoreOutlined />
									</Button>
								</Dropdown>
							)}
							<Button
								type="primary"
								icon={<PlusOutlined />}
								onClick={handleAdd}
								className="simplyconf-primary-actions-btn"
								data-testid="add-field-btn"
							>
								{__("Create", "simplyconf")}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>
			<Table
				dataSource={fields}
				columns={columns}
				rowKey="field_id"
				rowSelection={rowSelection}
				loading={loading}
				pagination={false}
				style={{
					background: "#fff",
					borderRadius: "8px",
					overflow: "hidden",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
				}}
			/>

			<StyledModal
				data-testid="custom-field-modal"
				title={
					editing
						? __("Edit Field", "simplyconf")
						: __("Add Field", "simplyconf")
				}
				titleIcon={editing ? <EditOutlined /> : <PlusOutlined />}
				open={isModalOpen}
				onCancel={() => setIsModalOpen(false)}
				onOk={handleSave}
				okText={__("Save", "simplyconf")}
				cancelText={__("Cancel", "simplyconf")}
				destroyOnClose
				width={800}
				style={{ top: 20 }}
			>
				<Form form={form} layout="vertical">
					<Tabs
						defaultActiveKey="basic"
						items={[
							{
								key: "basic",
								label: __("Basic Info", "simplyconf"),
								children: (
									<>
										<Form.Item
											name="label"
											label={__("Field Label", "simplyconf")}
											rules={[
												{
													required: true,
													message: __("Label is required", "simplyconf"),
												},
											]}
										>
											<Input
												data-testid="field-label-input"
												placeholder={__(
													"Enter display label for this field",
													"simplyconf",
												)}
											/>
										</Form.Item>
										<Form.Item
											name="name"
											label={__("Field Name", "simplyconf")}
											rules={[
												{
													required: true,
													message: __("Name is required", "simplyconf"),
												},
											]}
											extra={__(
												"Used internally - should be unique and contain no spaces",
												"simplyconf",
											)}
										>
											<Input
												data-testid="field-name-input"
												placeholder={__("field_name", "simplyconf")}
											/>
										</Form.Item>
										<Form.Item
											name="type"
											label={__("Field Type", "simplyconf")}
											rules={[
												{
													required: true,
													message: __("Type is required", "simplyconf"),
												},
											]}
										>
											<Select
												data-testid="field-type-select"
												placeholder={__("Select field type", "simplyconf")}
											>
												{fieldTypes.map((t) => (
													<Option key={t.value} value={t.value}>
														{t.label}
													</Option>
												))}
											</Select>
										</Form.Item>
									</>
								),
							},
							{
								key: "configuration",
								label: __("Configuration", "simplyconf"),
								children: (
									<>
										{/* Configuration options based on field type */}
										<Form.Item
											shouldUpdate={(prev, curr) => prev.type !== curr.type}
											noStyle
										>
											{({ getFieldValue }) => {
												const fieldType = getFieldValue("type");
												const optionBasedTypes = [
													"select",
													"radio",
													"checkbox",
												];
												const ratingTypes = ["rating"];
												const fileUploadTypes = ["file_upload"];

												// Only show configuration card if there are specific options for this field type
												const hasConfiguration =
													optionBasedTypes.includes(fieldType) ||
													ratingTypes.includes(fieldType) ||
													fileUploadTypes.includes(fieldType);

												return hasConfiguration ? (
													<>
														{/* Options for selection-based fields */}
														{optionBasedTypes.includes(fieldType) && (
															<Form.Item
																name="options"
																label={
																	fieldType === "checkbox"
																		? __(
																				"Options (optional - leave empty for single checkbox)",
																				"simplyconf",
																			)
																		: __(
																				"Options (one per line or comma separated)",
																				"simplyconf",
																			)
																}
																rules={
																	fieldType === "checkbox"
																		? [] // No validation required for checkbox
																		: [
																				{
																					required: true,
																					message: __(
																						"Options are required for this field type",
																						"simplyconf",
																					),
																				},
																			]
																}
															>
																<Input.TextArea
																	rows={4}
																	placeholder={
																		fieldType === "checkbox"
																			? __(
																					"Option 1\nOption 2\nOption 3\n\n(Leave empty for single checkbox)",
																					"simplyconf",
																				)
																			: __(
																					"Option 1\nOption 2\nOption 3\n\nor\n\nOption 1, Option 2, Option 3",
																					"simplyconf",
																				)
																	}
																/>
															</Form.Item>
														)}

														{/* Rating configuration */}
														{ratingTypes.includes(fieldType) && (
															<Form.Item
																name="max_rating"
																label={__("Maximum Rating", "simplyconf")}
																initialValue={5}
															>
																<Input type="number" min={1} max={10} />
															</Form.Item>
														)}

														{/* File upload configuration */}
														{fileUploadTypes.includes(fieldType) && (
															<>
																<Form.Item
																	name="options"
																	label={__("Allowed File Types", "simplyconf")}
																	extra={__(
																		"Comma-separated MIME types or extensions. Leave empty to allow all common document types.",
																		"simplyconf",
																	)}
																>
																	<Input placeholder=".pdf,.doc,.docx,.jpg,.png" />
																</Form.Item>
																<Form.Item
																	name="help_text"
																	label={__("Help Text", "simplyconf")}
																	extra={__(
																		"Instructions displayed below the upload field",
																		"simplyconf",
																	)}
																>
																	<Input
																		placeholder={__(
																			"Upload a PDF or Word document (max 50MB)",
																			"simplyconf",
																		)}
																	/>
																</Form.Item>
															</>
														)}
													</>
												) : null;
											}}
										</Form.Item>
									</>
								),
							},
							{
								key: "settings",
								label: __("Settings", "simplyconf"),
								children: (
									<>
										<Form.Item
											name="required"
											label={__("Required", "simplyconf")}
											valuePropName="checked"
										>
											<Switch />
										</Form.Item>
										<Form.Item
											name="show_in_admin"
											label={__("Show in Admin Table", "simplyconf")}
											valuePropName="checked"
											extra={__(
												"Display this field as a column in admin tables",
												"simplyconf",
											)}
										>
											<Switch />
										</Form.Item>
										<Form.Item
											name="show_in_frontend"
											label={__("Show in Frontend Table", "simplyconf")}
											valuePropName="checked"
											extra={__(
												"Display this field as a column in frontend tables",
												"simplyconf",
											)}
										>
											<Switch />
										</Form.Item>
										{usage === "user" && (
											<Form.Item
												name="show_in_registration"
												label={__("Show in Registration", "simplyconf")}
												valuePropName="checked"
												extra={__(
													"Include this field in user registration forms",
													"simplyconf",
												)}
											>
												<Switch />
											</Form.Item>
										)}
										<Form.Item
											name="order_num"
											label={__("Display Order", "simplyconf")}
											rules={[
												{
													required: true,
													message: __("Order is required", "simplyconf"),
												},
											]}
										>
											<Input type="number" />
										</Form.Item>
									</>
								),
							},
							{
								key: "conditional",
								label: __("Conditional Logic", "simplyconf"),
								children: (
									<>
										<Form.Item
											name="conditional_enabled"
											label={__("Enable Conditional Logic", "simplyconf")}
											valuePropName="checked"
										>
											<Switch />
										</Form.Item>

										<Form.Item
											shouldUpdate={(prev, curr) =>
												prev.conditional_enabled !== curr.conditional_enabled
											}
											noStyle
										>
											{({ getFieldValue }) => {
												const enabled = getFieldValue("conditional_enabled");
												if (!enabled) return null;

												return (
													<>
														<Form.Item
															name="conditional_action"
															label={__("Action", "simplyconf")}
															rules={[{ required: true }]}
														>
															<Select>
																<Option value="show">
																	{__(
																		"Show this field when conditions are met",
																		"simplyconf",
																	)}
																</Option>
																<Option value="hide">
																	{__(
																		"Hide this field when conditions are met",
																		"simplyconf",
																	)}
																</Option>
															</Select>
														</Form.Item>

														<div style={{ marginBottom: 16 }}>
															<Form.List name="conditional_rules">
																{(fields, { add, remove }) => (
																	<>
																		{fields.map(
																			({ key, name, ...restField }, _index) => (
																				<Row
																					key={key}
																					gutter={8}
																					align="middle"
																					style={{ marginBottom: 8 }}
																				>
																					<Col span={8}>
																						<Form.Item
																							{...restField}
																							name={[name, "field_id"]}
																							rules={[
																								{
																									required: true,
																									message: __(
																										"Field is required",
																										"simplyconf",
																									),
																								},
																							]}
																						>
																							<Select
																								placeholder={__(
																									"Select field",
																									"simplyconf",
																								)}
																							>
																								{availableFields.map(
																									(field) => (
																										<Option
																											key={field.field_id}
																											value={field.field_id}
																										>
																											{field.label}
																										</Option>
																									),
																								)}
																							</Select>
																						</Form.Item>
																					</Col>
																					<Col span={6}>
																						<Form.Item
																							{...restField}
																							name={[name, "operator"]}
																							rules={[
																								{
																									required: true,
																									message: __(
																										"Operator is required",
																										"simplyconf",
																									),
																								},
																							]}
																						>
																							<Select
																								placeholder={__(
																									"Operator",
																									"simplyconf",
																								)}
																							>
																								<Option value="equals">
																									{__("equals", "simplyconf")}
																								</Option>
																								<Option value="not_equals">
																									{__(
																										"does not equal",
																										"simplyconf",
																									)}
																								</Option>
																								<Option value="contains">
																									{__("contains", "simplyconf")}
																								</Option>
																								<Option value="is_empty">
																									{__("is empty", "simplyconf")}
																								</Option>
																								<Option value="is_not_empty">
																									{__(
																										"is not empty",
																										"simplyconf",
																									)}
																								</Option>
																							</Select>
																						</Form.Item>
																					</Col>
																					<Col span={8}>
																						<Form.Item
																							{...restField}
																							name={[name, "value"]}
																							rules={[
																								{
																									required: true,
																									message: __(
																										"Value is required",
																										"simplyconf",
																									),
																								},
																							]}
																						>
																							<Input
																								placeholder={__(
																									"Value",
																									"simplyconf",
																								)}
																							/>
																						</Form.Item>
																					</Col>
																					<Col span={2}>
																						<Button
																							type="text"
																							danger
																							icon={<DeleteOutlined />}
																							onClick={() => remove(name)}
																						/>
																					</Col>
																				</Row>
																			),
																		)}
																		<Button
																			type="dashed"
																			onClick={() => add()}
																			icon={<PlusOutlined />}
																		>
																			{__("Add Rule", "simplyconf")}
																		</Button>
																	</>
																)}
															</Form.List>
														</div>

														<Form.Item
															name="conditional_logic"
															label={__("Match Logic", "simplyconf")}
															rules={[{ required: true }]}
														>
															<Select>
																<Option value="all">
																	{__("Match ALL rules (AND)", "simplyconf")}
																</Option>
																<Option value="any">
																	{__("Match ANY rule (OR)", "simplyconf")}
																</Option>
															</Select>
														</Form.Item>
													</>
												);
											}}
										</Form.Item>
									</>
								),
							},
						]}
					/>
				</Form>
			</StyledModal>
		</div>
	);
};

CustomFieldsAdmin.propTypes = {
	eventId: PropTypes.number.isRequired,
	usage: PropTypes.oneOf(["abstract", "review", "user", "author"]),
	title: PropTypes.string,
};

export default CustomFieldsAdmin;
