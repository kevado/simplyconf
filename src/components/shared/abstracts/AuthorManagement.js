import {
	DeleteOutlined,
	DownOutlined,
	EditOutlined,
	PlusOutlined,
	TeamOutlined,
	UpOutlined,
	UserAddOutlined,
} from "@ant-design/icons";
import AuthorForm from "@shared/authors/AuthorForm";
import StyledModal from "@shared/StyledModal";
import { __ } from "@wordpress/i18n";
import {
	Avatar,
	Button,
	Card,
	Col,
	Form,
	Modal,
	Row,
	Space,
	Switch,
	Tooltip,
} from "antd";
import PropTypes from "prop-types";
import { useState } from "react";
import { sprintf } from "sprintf-js";

// Author item component
const AuthorItem = ({
	author,
	index,
	moveAuthor,
	onEdit,
	onDelete,
	isPresenting,
	isCorresponding,
	totalAuthors,
	disabled = false,
}) => {
	return (
		<div
			style={{
				padding: "12px",
				border: "1px solid #f0f0f0",
				borderRadius: "8px",
				background: "#fff",
				marginBottom: "8px",
			}}
		>
			<Row align="middle" gutter={16}>
				<Col flex="auto">
					<Space>
						<Avatar style={{ backgroundColor: "#1890ff" }}>
							{author.first_name?.[0]}
							{author.last_name?.[0]}
						</Avatar>
						<div>
							<div style={{ fontWeight: "bold" }}>
								{author.first_name} {author.last_name}
								{index === 0 && (
									<span style={{ color: "#1890ff", marginLeft: 8 }}>
										(Lead Author)
									</span>
								)}
							</div>
							<div style={{ color: "#666", fontSize: "12px" }}>
								{author.email}
							</div>
							<Space size="small" style={{ marginTop: 4 }}>
								{isPresenting && (
									<span style={{ color: "#52c41a", fontSize: "12px" }}>
										✓ Presenting
									</span>
								)}
								{isCorresponding && (
									<span style={{ color: "#fa8c16", fontSize: "12px" }}>
										✓ Corresponding
									</span>
								)}
							</Space>
						</div>
					</Space>
				</Col>
				<Col>
					<Space>
						<Tooltip title={__("Move up", "simplyconf")}>
							<Button
								size="small"
								icon={<UpOutlined />}
								onClick={() => moveAuthor(index, Math.max(0, index - 1))}
								disabled={disabled || index === 0}
							/>
						</Tooltip>
						<Tooltip title={__("Move down", "simplyconf")}>
							<Button
								size="small"
								icon={<DownOutlined />}
								onClick={() =>
									moveAuthor(index, Math.min(totalAuthors - 1, index + 1))
								}
								disabled={disabled || index === totalAuthors - 1}
							/>
						</Tooltip>
						<Button
							size="small"
							icon={<EditOutlined />}
							onClick={() => onEdit(author, index)}
							disabled={disabled}
						/>
						<Button
							size="small"
							danger
							icon={<DeleteOutlined />}
							onClick={() => onDelete(index)}
							disabled={disabled}
						/>
					</Space>
				</Col>
			</Row>
		</div>
	);
};

const AuthorManagement = ({
	authors = [],
	onAuthorsChange,
	eventId,
	customFields = [],
	loading = false,
	disabled = false,
}) => {
	const [modalOpen, setModalOpen] = useState(false);
	const [editingAuthor, setEditingAuthor] = useState(null);
	const [form] = Form.useForm();
	const [_formValues, setFormValues] = useState({});
	const [visibleCustomFields, setVisibleCustomFields] = useState([]);

	// Move author in the list
	const moveAuthor = (fromIndex, toIndex) => {
		const newAuthors = [...authors];
		const [removed] = newAuthors.splice(fromIndex, 1);
		newAuthors.splice(toIndex, 0, removed);
		onAuthorsChange(newAuthors);
	};

	// Handle author edit
	const handleEditAuthor = (author, index) => {
		setEditingAuthor({ ...author, idx: index });
		setModalOpen(true);
	};

	// Handle author delete
	const handleDeleteAuthor = (index) => {
		Modal.confirm({
			title: __("Remove Author", "simplyconf"),
			content: sprintf(
				__("Are you sure you want to remove %s %s?", "simplyconf"),
				authors[index]?.first_name,
				authors[index]?.last_name,
			),
			okText: __("Yes, Remove", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: () => {
				const newAuthors = authors.filter((_, i) => i !== index);
				onAuthorsChange(newAuthors);
			},
		});
	};

	// Handle modal OK
	const handleModalOk = async () => {
		try {
			const values = await form.validateFields();

			// Transform field_id keys to nested object - only for visible fields
			const transformedValues = { ...values };
			const customFieldsObj = {};

			visibleCustomFields.forEach((field) => {
				const fieldValue = values[field.field_id];
				if (fieldValue !== undefined) {
					customFieldsObj[field.field_id] = fieldValue;
					delete transformedValues[field.field_id];
				}
			});

			if (Object.keys(customFieldsObj).length > 0) {
				transformedValues.custom_fields = customFieldsObj;
			}

			if (editingAuthor) {
				const newAuthors = [...authors];
				newAuthors[editingAuthor.idx] = transformedValues;
				onAuthorsChange(newAuthors);
			} else {
				onAuthorsChange([...authors, transformedValues]);
			}

			setModalOpen(false);
			form.resetFields();
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	return (
		<div>
			<Card
				title={
					<Space>
						<TeamOutlined />
						<span>
							{sprintf(__("Authors (%d)", "simplyconf"), authors.length)}
						</span>
					</Space>
				}
				extra={
					<Button
						type="primary"
						icon={<UserAddOutlined />}
						onClick={() => {
							setEditingAuthor(null);
							setModalOpen(true);
						}}
						disabled={disabled || loading}
						data-testid="add-author-btn"
					>
						{__("Add Author", "simplyconf")}
					</Button>
				}
			>
				{authors.length === 0 ? (
					<div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
						<TeamOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
						<div>{__("No authors added yet", "simplyconf")}</div>
						<div style={{ fontSize: "14px", marginTop: "8px" }}>
							{__('Click "Add Author" to get started', "simplyconf")}
						</div>
					</div>
				) : (
					<div>
						<div
							style={{ marginBottom: "16px", color: "#666", fontSize: "14px" }}
						>
							{__(
								"Use the up/down buttons to reorder authors. The first author is considered the lead author.",
								"simplyconf",
							)}
						</div>
						{authors.map((author, index) => (
							<AuthorItem
								key={`author-${index}`}
								author={author}
								index={index}
								moveAuthor={moveAuthor}
								onEdit={handleEditAuthor}
								onDelete={handleDeleteAuthor}
								isPresenting={
									author.is_presenter === 1 ||
									author.is_presenter === "1" ||
									author.is_presenter === true
								}
								isCorresponding={
									author.is_corresponding === 1 ||
									author.is_corresponding === "1" ||
									author.is_corresponding === true
								}
								totalAuthors={authors.length}
								disabled={disabled}
							/>
						))}
					</div>
				)}
			</Card>

			{/* Author Modal */}
			<StyledModal
				data-testid="author-management-modal"
				title={
					editingAuthor
						? __("Edit Author", "simplyconf")
						: __("Add Author", "simplyconf")
				}
				titleIcon={editingAuthor ? <EditOutlined /> : <PlusOutlined />}
				open={modalOpen}
				onCancel={() => {
					setModalOpen(false);
					form.resetFields();
				}}
				onOk={handleModalOk}
				width={600}
				destroyOnClose
			>
				<Form form={form} layout="vertical">
					<AuthorForm
						form={form}
						customFields={customFields}
						initialAuthor={editingAuthor}
						onFormValuesChange={(_changed, all) => setFormValues(all)}
						onVisibleFieldsChange={setVisibleCustomFields}
						disabled={false}
					/>

					{/* Author Flags */}
					<Row gutter={16} style={{ marginTop: 16 }}>
						<Col span={12}>
							<Form.Item
								name="is_presenter"
								label={__("Presenter", "simplyconf")}
								valuePropName="checked"
								tooltip={__(
									"Check if this author will present the abstract",
									"simplyconf",
								)}
							>
								<Switch />
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item
								name="is_corresponding"
								label={__("Corresponding Author", "simplyconf")}
								valuePropName="checked"
								tooltip={__(
									"Check if this is the corresponding author",
									"simplyconf",
								)}
							>
								<Switch />
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</StyledModal>
		</div>
	);
};

AuthorManagement.propTypes = {
	authors: PropTypes.array,
	onAuthorsChange: PropTypes.func.isRequired,
	eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	customFields: PropTypes.array,
	loading: PropTypes.bool,
	disabled: PropTypes.bool,
};

export default AuthorManagement;
