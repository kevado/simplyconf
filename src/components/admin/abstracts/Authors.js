import {
	EditOutlined,
	EyeOutlined,
	LayoutOutlined,
	LinkOutlined,
	MailOutlined,
	ReloadOutlined,
	SettingOutlined,
	UserOutlined,
} from "@ant-design/icons";
import AuthorForm from "@components/shared/authors/AuthorForm";
import StyledModal from "@components/shared/StyledModal";
import { useConditionalFields } from "@hooks/useConditionalFields";
import { useTerminology } from "@hooks/useTerminology";
import AuthorService from "@services/authors";
import CustomFieldFileValue from "@shared/customFields/CustomFieldFileValue";
import {
	fetchCustomFields,
	toggleCustomFieldVisibility,
} from "@state/customFieldsSlice";
import {
	fetchColumnVisibility,
	saveColumnVisibility,
} from "@state/preferenceSlice";
import { showError, showSuccess } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Checkbox,
	Col,
	Descriptions,
	Dropdown,
	Form,
	Input,
	Row,
	Select,
	Space,
	Table,
	Tag,
	Typography,
	theme,
} from "antd";

const { Search } = Input;

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sprintf } from "sprintf-js";

const { Text } = Typography;
const { Option } = Select;

const Authors = () => {
	const { token } = theme.useToken();
	const dispatch = useDispatch();
	const [form] = Form.useForm();
	const [authors, setAuthors] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterLinked, setFilterLinked] = useState("all");
	const [isColumnsOpen, setIsColumnsOpen] = useState(false);
	const [customFieldColumns, setCustomFieldColumns] = useState([]);
	const [isViewOpen, setIsViewOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [selectedAuthor, setSelectedAuthor] = useState(null);
	const [formValues, setFormValues] = useState({});
	const [visibleCustomFields, setVisibleCustomFields] = useState([]);

	// Evaluate conditional logic for edit modal (must be at component level)
	const _visibleFieldsForEdit = useConditionalFields(
		authorCustomFields,
		formValues,
		"", // No prefix - use label
	);

	const [visibleFixedColumns, setVisibleFixedColumns] = useState({
		name: true,
		email: true,
		wp_account: true,
		abstracts: true,
	});
	const eventId = useSelector((state) => state.events.globalId);
	const authorCustomFields = useSelector(
		(state) => state.customFields.author || [],
	);
	const columnVisibility = useSelector(
		(state) => state.preferences.columnVisibility.authors,
	);

	const { getTerm } = useTerminology();

	// Fetch author custom fields when event changes
	useEffect(() => {
		if (eventId) {
			dispatch(
				fetchCustomFields({
					event_id: eventId,
					usage: "author",
				}),
			);
			dispatch(fetchColumnVisibility({ eventId, context: "authors" }));
		}
	}, [dispatch, eventId]);

	// Sync Redux column visibility to local state
	useEffect(() => {
		if (columnVisibility) {
			setVisibleFixedColumns(columnVisibility);

			// Also restore custom field visibility from user preferences if available
			if (
				columnVisibility.customFields &&
				authorCustomFields &&
				authorCustomFields.length > 0
			) {
				const fieldColumns = authorCustomFields.map((field) => ({
					field_id: field.field_id,
					label: field.label,
					visible:
						columnVisibility.customFields[field.field_id] !== false
							? Number.parseInt(field.show_in_admin, 10) === 1
							: false,
					dataIndex: field.label,
					key: field.field_id,
				}));
				setCustomFieldColumns(fieldColumns);
			}
		}
	}, [columnVisibility, authorCustomFields]);

	// Build custom field columns from Redux state (only when no user preferences exist)
	useEffect(() => {
		if (
			authorCustomFields &&
			authorCustomFields.length > 0 &&
			(!columnVisibility || !columnVisibility.customFields)
		) {
			const fieldColumns = authorCustomFields.map((field) => ({
				field_id: field.field_id,
				label: field.label,
				visible: Number.parseInt(field.show_in_admin, 10) === 1,
				dataIndex: field.label,
				key: field.field_id,
			}));
			setCustomFieldColumns(fieldColumns);
		}
	}, [authorCustomFields, columnVisibility]);

	useEffect(() => {
		if (eventId) {
			loadAuthors();
		}
	}, [eventId, loadAuthors]);

	// Reset form when selectedAuthor changes
	useEffect(() => {
		if (selectedAuthor && isEditOpen) {
			form.setFieldsValue({
				first_name: selectedAuthor.first_name,
				last_name: selectedAuthor.last_name,
				email: selectedAuthor.email,
				...selectedAuthor.custom_fields?.reduce(
					(acc, field) => ({
						...acc,
						[`custom_fields.${field.field_id}`]: field.value,
					}),
					{},
				),
			});
		}
	}, [selectedAuthor, isEditOpen, form]);

	const loadAuthors = async () => {
		setLoading(true);
		try {
			const params = { event_id: eventId };
			if (filterLinked === "linked") {
				params.has_user = true;
			} else if (filterLinked === "external") {
				params.has_user = false;
			}
			const data = await AuthorService.getAll(params);
			// Ensure data is always an array
			setAuthors(Array.isArray(data) ? data : []);
		} catch (error) {
			showError(__("Failed to load authors", "simplyconf"));
			console.error(error);
			setAuthors([]);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = async () => {
		if (!searchTerm.trim()) {
			loadAuthors();
			return;
		}

		setLoading(true);
		try {
			const data = await AuthorService.search(searchTerm);
			// Ensure data is always an array
			setAuthors(Array.isArray(data) ? data : []);
		} catch (error) {
			showError(__("Search failed", "simplyconf"));
			console.error(error);
			setAuthors([]);
		} finally {
			setLoading(false);
		}
	};

	const handleLinkUser = async (authorId) => {
		try {
			await AuthorService.linkToUser(authorId);
			showSuccess(__("Author linked to WordPress user", "simplyconf"));
			loadAuthors();
		} catch (error) {
			showError(
				error.response?.data?.message ||
					__(
						"Failed to link author. No WordPress user found with this email.",
						"simplyconf",
					),
			);
		}
	};

	const handleViewAuthor = async (author) => {
		try {
			const fullAuthor = await AuthorService.getById(author.author_id);
			setSelectedAuthor(fullAuthor);
			setIsViewOpen(true);
		} catch (_error) {
			showError(__("Failed to load author details", "simplyconf"));
		}
	};

	const handleEditAuthor = async (author) => {
		try {
			const fullAuthor = await AuthorService.getById(author.author_id);
			setSelectedAuthor(fullAuthor);
			setIsEditOpen(true);
		} catch (_error) {
			showError(__("Failed to load author details", "simplyconf"));
		}
	};

	// Function to toggle column visibility
	const handleToggleColumn = useCallback(
		(field) => {
			// Update local state immediately
			const updatedColumns = customFieldColumns.map((col) =>
				col.field_id === field.field_id
					? { ...col, visible: !col.visible }
					: col,
			);
			setCustomFieldColumns(updatedColumns);

			// Save custom field visibility to user preferences for persistence
			const customFieldVisibility = {};
			updatedColumns.forEach((col) => {
				customFieldVisibility[col.field_id] = col.visible;
			});

			dispatch(
				saveColumnVisibility({
					eventId,
					context: "authors",
					visibility: {
						...visibleFixedColumns,
						customFields: customFieldVisibility,
					},
				}),
			);

			// Persist visibility change to database
			if (field?.field_id) {
				const newVisibility =
					Number.parseInt(field.show_in_admin, 10) === 0 ? 1 : 0;
				dispatch(
					toggleCustomFieldVisibility({
						field_id: field.field_id,
						show_in_admin: newVisibility,
						event_id: eventId,
						usage: "author",
					}),
				);
			}
		},
		[dispatch, eventId, customFieldColumns, visibleFixedColumns],
	);

	// Function to toggle fixed column visibility
	const handleToggleFixedColumn = useCallback(
		async (columnKey) => {
			const updated = {
				...visibleFixedColumns,
				[columnKey]: !visibleFixedColumns[columnKey],
			};
			setVisibleFixedColumns(updated);
			await dispatch(
				saveColumnVisibility({
					eventId,
					context: "authors",
					visibility: updated,
				}),
			);
		},
		[visibleFixedColumns, dispatch, eventId],
	);

	// Build columns dynamically with custom fields
	const columns = useMemo(() => {
		const columns = [
			{
				title: __("ID", "simplyconf"),
				dataIndex: "author_id",
				key: "author_id",
				width: 80,
				sorter: (a, b) => a.author_id - b.author_id,
			},
		];

		// Name column (conditionally added)
		if (visibleFixedColumns.name) {
			columns.push({
				title: __("Name", "simplyconf"),
				key: "name",
				render: (_, record) => (
					<Button
						type="link"
						icon={<UserOutlined />}
						onClick={() => handleViewAuthor(record)}
						className="simplyconf-table-link"
					>
						{record.first_name} {record.last_name}
					</Button>
				),
				sorter: (a, b) => a.last_name.localeCompare(b.last_name),
			});
		}

		// Email column (conditionally added)
		if (visibleFixedColumns.email) {
			columns.push({
				title: __("Email", "simplyconf"),
				dataIndex: "email",
				key: "email",
				render: (email) => (
					<Space>
						<MailOutlined />
						<Text copyable>{email}</Text>
					</Space>
				),
			});
		}

		// Add visible custom field columns
		const visibleCustomFields = customFieldColumns
			.filter((field) => field.visible)
			.map((field) => ({
				title: field.label,
				key: field.field_id,
				render: (_, record) => {
					// Find custom field value in record.custom_fields array
					const customField = record.custom_fields?.find(
						(cf) => cf.field_id === field.field_id,
					);
					if (!customField?.value) {
						return <Text type="secondary">{__("—", "simplyconf")}</Text>;
					}
					if (field.type === "file_upload") {
						return <CustomFieldFileValue value={customField.value} />;
					}
					return <Text>{customField.value}</Text>;
				},
			}));

		columns.push(...visibleCustomFields);

		// WP Account column (conditionally added)
		if (visibleFixedColumns.wp_account) {
			columns.push({
				title: __("WP Account", "simplyconf"),
				key: "user_link",
				render: (_, record) => {
					if (record.user_id) {
						return (
							<Tag color="green" icon={<LinkOutlined />}>
								{record.wp_display_name || __("Linked", "simplyconf")}
							</Tag>
						);
					}
					return (
						<Tag color="default" icon={<UserOutlined />}>
							{__("External", "simplyconf")}
						</Tag>
					);
				},
				filters: [
					{ text: __("Linked to WP", "simplyconf"), value: "linked" },
					{ text: __("External", "simplyconf"), value: "external" },
				],
				onFilter: (value, record) => {
					if (value === "linked") return !!record.user_id;
					if (value === "external") return !record.user_id;
					return true;
				},
			});
		}

		// Abstracts column (conditionally added)
		if (visibleFixedColumns.abstracts) {
			columns.push({
				title: getTerm("abstract", 2),
				dataIndex: "abstract_count",
				key: "abstract_count",
				render: (_count, record) => {
					if (!record.abstracts || record.abstracts.length === 0) {
						return <Tag color="default">0</Tag>;
					}

					return (
						<Space size="small" wrap>
							{record.abstracts.map((abstract) => (
								<Tag key={abstract.abstract_id} color="blue">
									#{abstract.abstract_id}
								</Tag>
							))}
						</Space>
					);
				},
				sorter: (a, b) => (a.abstract_count || 0) - (b.abstract_count || 0),
			});
		}

		// Actions column - always visible
		columns.push({
			title: __("Actions", "simplyconf"),
			key: "actions",
			width: 80,
			align: "center",
			render: (_, record) => {
				const menuItems = [
					{
						key: "view",
						icon: <EyeOutlined />,
						label: __("View", "simplyconf"),
						onClick: () => handleViewAuthor(record),
					},
					{
						key: "edit",
						icon: <EditOutlined />,
						label: __("Edit", "simplyconf"),
						onClick: () => handleEditAuthor(record),
					},
				];

				// Add link user option if not linked
				if (!record.user_id) {
					menuItems.push({
						key: "link",
						icon: <LinkOutlined />,
						label: __("Link User", "simplyconf"),
						onClick: () => handleLinkUser(record.author_id),
					});
				}

				return (
					<Dropdown
						menu={{ items: menuItems }}
						trigger={["hover"]}
						placement="left"
					>
						<Button
							type="text"
							icon={<SettingOutlined />}
							style={{ cursor: "pointer" }}
						/>
					</Dropdown>
				);
			},
		});

		return columns;
	}, [
		customFieldColumns,
		visibleFixedColumns,
		getTerm,
		handleEditAuthor,
		handleLinkUser,
		handleViewAuthor,
	]);

	return (
		<div style={{ padding: "0px" }}>
			{/* Header Section with Filters */}
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle" gutter={[16, 16]}>
					<Col>
						<Space>
							<Typography.Title level={3} style={{ margin: 0, color: "#fff" }}>
								{getTerm("author", 2)}
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
								({authors.length} {__("total", "simplyconf")})
							</Typography.Text>
						</Space>
					</Col>
					<Col>
						<Space>
							<Search
								className="simplyconf-admin-search"
								placeholder={__("Search by name or email...", "simplyconf")}
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onPressEnter={handleSearch}
								allowClear
							/>
							<Select
								value={filterLinked}
								onChange={setFilterLinked}
								style={{ width: 180 }}
							>
								<Option value="all">
									{sprintf(__("All %s", "simplyconf"), getTerm("author", 2))}
								</Option>
								<Option value="linked">
									{__("Linked to WordPress", "simplyconf")}
								</Option>
								<Option value="external">
									{__("External Only", "simplyconf")}
								</Option>
							</Select>
							<Button
								icon={<ReloadOutlined />}
								onClick={loadAuthors}
								type="text"
								loading={loading}
								className="simplyconf-secondary-action-btn"
							/>
							<Button
								data-testid="manage-columns-btn"
								type="text"
								icon={<LayoutOutlined />}
								onClick={() => setIsColumnsOpen(true)}
								size="middle"
								className="simplyconf-secondary-action-btn"
							/>
						</Space>
					</Col>
				</Row>
			</div>

			{/* Table */}
			<Table
				columns={columns}
				dataSource={authors}
				rowKey="author_id"
				loading={loading}
				pagination={getTablePagination({
					total: authors.length,
					entityName: getTerm("author", 2).toLowerCase(),
				})}
			/>

			{/* Column Visibility Modal */}
			<StyledModal
				title={__("Manage Columns", "simplyconf")}
				titleIcon={<LayoutOutlined />}
				open={isColumnsOpen}
				onCancel={() => setIsColumnsOpen(false)}
				footer={null}
				width={650}
			>
				<div style={{ padding: "8px 0" }}>
					<Typography.Text type="secondary" style={{ fontSize: "13px" }}>
						{__(
							"Customize which columns are visible in your table view",
							"simplyconf",
						)}
					</Typography.Text>
				</div>

				<Space
					direction="vertical"
					style={{ width: "100%", marginTop: "16px" }}
					size="middle"
				>
					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							{__("📌 Fixed Columns", "simplyconf")}
						</Typography.Title>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2, 1fr)",
								gap: "10px",
							}}
						>
							<Checkbox
								checked={visibleFixedColumns.name}
								onChange={() => handleToggleFixedColumn("name")}
								style={{ padding: "4px 0" }}
							>
								{__("Name", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.email}
								onChange={() => handleToggleFixedColumn("email")}
								style={{ padding: "4px 0" }}
							>
								{__("Email", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.wp_account}
								onChange={() => handleToggleFixedColumn("wp_account")}
								style={{ padding: "4px 0" }}
							>
								{__("WP Account", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.abstracts}
								onChange={() => handleToggleFixedColumn("abstracts")}
								style={{ padding: "4px 0" }}
							>
								{getTerm("abstract", 2)}
							</Checkbox>
						</div>
					</div>

					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							{__("⚙️ Custom Fields", "simplyconf")}
						</Typography.Title>
						{customFieldColumns.length > 0 ? (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, 1fr)",
									gap: "10px",
								}}
							>
								{customFieldColumns.map((field) => (
									<Checkbox
										key={field.field_id}
										checked={field.visible}
										onChange={() => handleToggleColumn(field)}
										style={{ padding: "4px 0" }}
									>
										{field.label}
									</Checkbox>
								))}
							</div>
						) : (
							<div
								style={{
									textAlign: "center",
									padding: "20px",
									background: "#fff",
									borderRadius: "6px",
									border: "1px dashed #d9d9d9",
								}}
							>
								<Typography.Text type="secondary" style={{ fontSize: "13px" }}>
									{__(
										"No custom fields have been created for this event",
										"simplyconf",
									)}
								</Typography.Text>
							</div>
						)}
					</div>
				</Space>
			</StyledModal>

			{/* View Author Modal */}
			<StyledModal
				title={sprintf(__("View %s", "simplyconf"), getTerm("author", 1))}
				titleIcon={<EyeOutlined />}
				open={isViewOpen}
				onCancel={() => setIsViewOpen(false)}
				footer={[
					<Button key="close" onClick={() => setIsViewOpen(false)}>
						{__("Close", "simplyconf")}
					</Button>,
				]}
				width={600}
			>
				{selectedAuthor && (
					<Descriptions column={1} bordered>
						<Descriptions.Item label={__("First Name", "simplyconf")}>
							{selectedAuthor.first_name}
						</Descriptions.Item>
						<Descriptions.Item label={__("Last Name", "simplyconf")}>
							{selectedAuthor.last_name}
						</Descriptions.Item>
						<Descriptions.Item label={__("Email", "simplyconf")}>
							{selectedAuthor.email}
						</Descriptions.Item>
						<Descriptions.Item label={__("Linked User", "simplyconf")}>
							{selectedAuthor.user_id
								? __("Yes", "simplyconf")
								: __("No", "simplyconf")}
						</Descriptions.Item>
						{selectedAuthor.custom_fields &&
							selectedAuthor.custom_fields.length > 0 &&
							authorCustomFields.length > 0 && (
								<Descriptions.Item
									label={__("Custom Fields", "simplyconf")}
									span={1}
									contentStyle={{
										display: "block",
										padding: 0,
									}}
								>
									<Descriptions
										column={1}
										bordered
										size="small"
										style={{ marginTop: 8 }}
									>
										{selectedAuthor.custom_fields
											.filter((field) =>
												// Only show author custom fields
												authorCustomFields.some(
													(authorField) =>
														String(authorField.field_id) ===
														String(field.field_id),
												),
											)
											.map((field) => {
												const fieldDef = authorCustomFields.find(
													(f) => String(f.field_id) === String(field.field_id),
												);
												return (
													<Descriptions.Item
														key={field.field_id}
														label={fieldDef?.label || field.label}
													>
														{field.value || "-"}
													</Descriptions.Item>
												);
											})}
									</Descriptions>
								</Descriptions.Item>
							)}
					</Descriptions>
				)}
			</StyledModal>

			{/* Edit Author Modal */}
			<StyledModal
				title={sprintf(__("Edit %s", "simplyconf"), getTerm("author", 1))}
				titleIcon={<EditOutlined />}
				open={isEditOpen}
				onCancel={() => setIsEditOpen(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsEditOpen(false)}>
						{__("Cancel", "simplyconf")}
					</Button>,
					<Button key="save" type="primary" onClick={() => form.submit()}>
						{__("Save", "simplyconf")}
					</Button>,
				]}
				width={720}
			>
				{selectedAuthor && (
					<Form
						form={form}
						layout="vertical"
						onFinish={async (values) => {
							try {
								const customFields = {};
								const standardFields = {
									first_name: values.first_name,
									last_name: values.last_name,
									email: values.email,
								};

								visibleCustomFields.forEach((field) => {
									const fieldValue = values[field.field_id];
									if (fieldValue !== undefined) {
										customFields[field.field_id] = fieldValue;
									}
								});

								const payload = {
									...standardFields,
									custom_fields: customFields,
								};

								await AuthorService.update(
									selectedAuthor.author_id,
									payload,
									eventId,
								);
								showSuccess(__("Author updated successfully", "simplyconf"));
								setIsEditOpen(false);
								setSelectedAuthor(null);
								form.resetFields();
								loadAuthors();
							} catch (error) {
								showError(
									error.message || __("Failed to update author", "simplyconf"),
								);
							}
						}}
					>
						<AuthorForm
							form={form}
							customFields={authorCustomFields}
							initialAuthor={selectedAuthor}
							onFormValuesChange={(_changed, all) => setFormValues(all)}
							onVisibleFieldsChange={setVisibleCustomFields}
							disabled={false}
						/>
					</Form>
				)}
			</StyledModal>
		</div>
	);
};

export default Authors;
