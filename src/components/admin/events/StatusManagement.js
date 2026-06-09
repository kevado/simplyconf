import {
	CheckCircleOutlined,
	DeleteOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import StyledModal from "@shared/StyledModal";
import {
	createStatus,
	deleteStatus,
	fetchStatuses,
	initializeDefaultStatuses,
	selectStatuses,
	selectStatusesError,
	selectStatusesErrorMessage,
	selectStatusesLoading,
	updateStatus,
} from "@state/statusSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Col,
	ColorPicker,
	Form,
	Input,
	InputNumber,
	Popconfirm,
	Row,
	Select,
	Space,
	Switch,
	Table,
	Tag,
	Typography,
	theme,
} from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;
const { Option } = Select;

const StatusManagement = () => {
	const { token } = theme.useToken();
	const { getTerm } = useTerminology();
	const dispatch = useDispatch();
	const [form] = Form.useForm();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingStatus, setEditingStatus] = useState(null);
	const [statusType, setStatusType] = useState("abstract");

	// Redux state
	const globalEventId = useSelector((state) => state.events.globalId);
	const currentEvent = useSelector(
		(state) => state.events.events[state.events.globalId],
	);
	const statuses = useSelector(selectStatuses(globalEventId, statusType));
	const loading = useSelector(selectStatusesLoading);
	const error = useSelector(selectStatusesError);
	const errorMessage = useSelector(selectStatusesErrorMessage);

	// Load statuses when component mounts or event/type changes
	useEffect(() => {
		if (globalEventId) {
			dispatch(fetchStatuses({ eventId: globalEventId, type: statusType }));
		}
	}, [dispatch, globalEventId, statusType]);

	// Handle form submission
	const handleSubmit = async (values) => {
		try {
			const statusData = {
				...values,
				event_id: globalEventId,
				type: statusType,
				color: values.color?.toHexString?.() || values.color || "#666666",
			};

			if (editingStatus) {
				await dispatch(
					updateStatus({
						statusId: editingStatus.status_id,
						statusData,
					}),
				).unwrap();
				showSuccess(__("Status updated successfully", "simplyconf"));
			} else {
				await dispatch(createStatus(statusData)).unwrap();
				showSuccess(__("Status created successfully", "simplyconf"));
			}

			setIsModalOpen(false);
			setEditingStatus(null);
			form.resetFields();

			// Refresh statuses
			dispatch(fetchStatuses({ eventId: globalEventId, type: statusType }));
		} catch (error) {
			showError(
				editingStatus
					? __("Failed to update status", "simplyconf")
					: __("Failed to create status", "simplyconf"),
			);
			console.error("Status operation error:", error);
		}
	};

	// Handle delete
	const handleDelete = async (statusId) => {
		try {
			await dispatch(deleteStatus(statusId)).unwrap();
			showSuccess(__("Status deleted successfully", "simplyconf"));
			dispatch(fetchStatuses({ eventId: globalEventId, type: statusType }));
		} catch (error) {
			showError(__("Failed to delete status", "simplyconf"));
			console.error("Delete error:", error);
		}
	};

	// Handle initialize default statuses
	const handleInitializeDefaults = async () => {
		try {
			await dispatch(
				initializeDefaultStatuses({
					eventId: globalEventId,
					type: statusType,
				}),
			).unwrap();
			showSuccess(
				__("Default statuses initialized successfully", "simplyconf"),
			);
			dispatch(fetchStatuses({ eventId: globalEventId, type: statusType }));
		} catch (error) {
			showError(__("Failed to initialize default statuses", "simplyconf"));
			console.error("Initialize error:", error);
		}
	};

	// Open modal for editing
	const openEditModal = (status = null) => {
		setEditingStatus(status);
		setIsModalOpen(true);

		if (status) {
			form.setFieldsValue({
				...status,
				color: status.color || "#666666",
			});
		} else {
			form.resetFields();
		}
	};

	// Available icons for statuses
	const availableIcons = [
		"edit",
		"send",
		"eye",
		"check",
		"times",
		"clock",
		"plus",
		"minus",
		"star",
		"heart",
		"flag",
		"bell",
		"home",
		"user",
		"cog",
		"search",
		"mail",
		"phone",
	];

	// Table columns
	const columns = [
		{
			title: __("Order", "simplyconf"),
			dataIndex: "order_num",
			key: "order_num",
			width: 80,
			render: (order) => order || 0,
		},
		{
			title: __("Name", "simplyconf"),
			dataIndex: "name",
			key: "name",
			width: 120,
		},
		{
			title: __("Label", "simplyconf"),
			dataIndex: "label",
			key: "label",
			width: 150,
		},
		{
			title: __("Description", "simplyconf"),
			dataIndex: "description",
			key: "description",
			ellipsis: true,
		},
		{
			title: __("Color", "simplyconf"),
			dataIndex: "color",
			key: "color",
			width: 80,
			render: (color) => (
				<div
					style={{
						width: 20,
						height: 20,
						backgroundColor: color || "#666666",
						borderRadius: 4,
						border: "1px solid #d9d9d9",
					}}
				/>
			),
		},
		{
			title: __("Flags", "simplyconf"),
			key: "flags",
			width: 150,
			render: (_, record) => (
				<Space wrap>
					{record.is_initial && (
						<Tag color="blue">{__("Initial", "simplyconf")}</Tag>
					)}
					{record.is_default && (
						<Tag color="green">{__("Default", "simplyconf")}</Tag>
					)}
					{record.is_final && (
						<Tag color="red">{__("Final", "simplyconf")}</Tag>
					)}
				</Space>
			),
		},
		{
			title: __("Actions", "simplyconf"),
			key: "actions",
			width: 120,
			render: (_, record) => (
				<Space>
					<Button
						type="text"
						icon={<EditOutlined />}
						onClick={() => openEditModal(record)}
						size="small"
					/>
					<Popconfirm
						title={__(
							"Are you sure you want to delete this status?",
							"simplyconf",
						)}
						onConfirm={() => handleDelete(record.status_id)}
						okText={__("Yes", "simplyconf")}
						cancelText={__("No", "simplyconf")}
					>
						<Button type="text" danger icon={<DeleteOutlined />} size="small" />
					</Popconfirm>
				</Space>
			),
		},
	];

	if (!globalEventId) {
		return (
			<Card>
				<div style={{ textAlign: "center", padding: "40px 0" }}>
					<ExclamationCircleOutlined
						style={{ fontSize: 48, color: "#faad14", marginBottom: 16 }}
					/>
					<Title level={4}>{__("No Event Selected", "simplyconf")}</Title>
					<Text type="secondary">
						{__("Please select an event to manage statuses", "simplyconf")}
					</Text>
				</div>
			</Card>
		);
	}

	return (
		<Space direction="vertical" size="middle" style={{ display: "flex" }}>
			{/* Header */}
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Title level={3} style={{ margin: 0, color: "#fff" }}>
							{__("Status Management", "simplyconf")}
						</Title>
						<Text
							style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px" }}
						>
							{__("Manage statuses for", "simplyconf")}{" "}
							{currentEvent?.name || __("Current Event", "simplyconf")}
						</Text>
					</Col>
					<Col>
						<Space>
							<Select
								value={statusType}
								onChange={setStatusType}
								style={{ width: 120 }}
							>
								<Option value="abstract">{getTerm("abstract", 2)}</Option>
								<Option value="review">{getTerm("review", 2)}</Option>
							</Select>
							{/* Show Initialize Default Statuses button only when no statuses exist */}
							{(!statuses || statuses.length === 0) && (
								<Button
									icon={<CheckCircleOutlined />}
									onClick={handleInitializeDefaults}
									disabled={loading}
									className="simplyconf-secondary-actions-btn"
								>
									{__("Initialize Default Statuses", "simplyconf")}
								</Button>
							)}
							{/* Show Add Status button only when statuses exist */}
							{statuses && statuses.length > 0 && (
								<Button
									icon={<PlusOutlined />}
									type="primary"
									onClick={() => openEditModal()}
									className="simplyconf-primary-actions-btn"
								>
									{__("Create", "simplyconf")}
								</Button>
							)}
						</Space>
					</Col>
				</Row>
			</div>

			<Card className="simplyconf-content-card">
				{/* Error display */}
				{error && (
					<Card style={{ marginBottom: 16, borderColor: "#ff4d4f" }}>
						<Text type="danger">Error: {errorMessage}</Text>
					</Card>
				)}

				{/* Status Table */}
				<Table
					columns={columns}
					dataSource={statuses}
					rowKey="status_id"
					loading={loading}
					pagination={false}
					size="middle"
					locale={{
						emptyText: (
							<div style={{ padding: "40px 0" }}>
								<CheckCircleOutlined
									style={{
										fontSize: 48,
										color: "#d9d9d9",
										marginBottom: 16,
									}}
								/>
								<div>
									<Title level={4} type="secondary">
										{__("No Statuses Found", "simplyconf")}
									</Title>
									<Text type="secondary">
										{__(
											'Use "Initialize Default Statuses" in the page header to get started',
											"simplyconf",
										)}
									</Text>
								</div>
							</div>
						),
					}}
				/>
			</Card>

			{/* Add/Edit Modal */}
			<StyledModal
				data-testid="status-modal"
				title={
					editingStatus
						? __("Edit Status", "simplyconf")
						: __("Add Status", "simplyconf")
				}
				titleIcon={editingStatus ? <EditOutlined /> : <PlusOutlined />}
				open={isModalOpen}
				onCancel={() => {
					setIsModalOpen(false);
					setEditingStatus(null);
					form.resetFields();
				}}
				onOk={() => form.submit()}
				confirmLoading={loading}
				width={600}
			>
				<Form
					form={form}
					layout="vertical"
					onFinish={handleSubmit}
					initialValues={{
						color: "#666666",
						order_num: 0,
						is_default: false,
						is_initial: false,
						is_final: false,
					}}
				>
					<Row gutter={16}>
						<Col xs={24} sm={12}>
							<Form.Item
								name="name"
								label={__("Name", "simplyconf")}
								rules={[
									{
										required: true,
										message: __("Please enter status name", "simplyconf"),
									},
									{
										pattern: /^[a-z_]+$/,
										message: __(
											"Name must be lowercase letters and underscores only",
											"simplyconf",
										),
									},
								]}
							>
								<Input
									placeholder={__("e.g., draft, submitted", "simplyconf")}
								/>
							</Form.Item>
						</Col>
						<Col xs={24} sm={12}>
							<Form.Item
								name="label"
								label={__("Label", "simplyconf")}
								rules={[
									{
										required: true,
										message: __("Please enter status label", "simplyconf"),
									},
								]}
							>
								<Input
									placeholder={__("e.g., Draft, Submitted", "simplyconf")}
								/>
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="description" label={__("Description", "simplyconf")}>
						<Input.TextArea
							rows={3}
							placeholder={__("Brief description of this status", "simplyconf")}
						/>
					</Form.Item>

					<Row gutter={16}>
						<Col xs={24} sm={8}>
							<Form.Item name="color" label={__("Color", "simplyconf")}>
								<ColorPicker showText />
							</Form.Item>
						</Col>
						<Col xs={24} sm={8}>
							<Form.Item name="icon" label={__("Icon", "simplyconf")}>
								<Select
									placeholder={__("Select an icon", "simplyconf")}
									allowClear
								>
									{availableIcons.map((icon) => (
										<Option key={icon} value={icon}>
											{icon}
										</Option>
									))}
								</Select>
							</Form.Item>
						</Col>
						<Col xs={24} sm={8}>
							<Form.Item name="order_num" label={__("Order", "simplyconf")}>
								<InputNumber
									min={0}
									placeholder="0"
									style={{ width: "100%" }}
								/>
							</Form.Item>
						</Col>
					</Row>

					<Row gutter={16}>
						<Col xs={24} sm={8}>
							<Form.Item
								name="is_initial"
								label={__("Initial Status", "simplyconf")}
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
							<Text type="secondary" style={{ fontSize: 12 }}>
								{__("Used for new submissions", "simplyconf")}
							</Text>
						</Col>
						<Col xs={24} sm={8}>
							<Form.Item
								name="is_default"
								label={__("Default Status", "simplyconf")}
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
							<Text type="secondary" style={{ fontSize: 12 }}>
								{__("Default display status", "simplyconf")}
							</Text>
						</Col>
						<Col xs={24} sm={8}>
							<Form.Item
								name="is_final"
								label={__("Final Status", "simplyconf")}
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
							<Text type="secondary" style={{ fontSize: 12 }}>
								{__("No further changes allowed", "simplyconf")}
							</Text>
						</Col>
					</Row>
				</Form>
			</StyledModal>
		</Space>
	);
};

export default StatusManagement;
