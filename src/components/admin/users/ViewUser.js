import {
	ClockCircleOutlined,
	FileTextOutlined,
	IdcardOutlined,
	MailOutlined,
	SafetyOutlined,
	UserOutlined,
} from "@ant-design/icons";
import CustomFieldFileUpload from "@shared/customFields/CustomFieldFileUpload";
import { fetchCustomFields, selectUserFields } from "@state/customFieldsSlice";
import { __ } from "@wordpress/i18n";
import { Card, Col, Row, Space, Tag, Typography } from "antd";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Text, Title } = Typography;

const ViewUser = ({ onClose }) => {
	const dispatch = useDispatch();
	const [user, setUser] = useState(null);

	// Get data from Redux store using useSelector
	const { eventId, userId, users, userCustomFields } = useSelector((state) => ({
		eventId: state.events.globalId,
		userId: state.users.userId,
		users: state.users.users,
		userCustomFields: selectUserFields(state),
	}));

	useEffect(() => {
		if (eventId) {
			dispatch(fetchCustomFields({ event_id: eventId, usage: "user" }));
		}
	}, [dispatch, eventId]);

	useEffect(() => {
		if (userId && users[userId]) {
			setUser(users[userId]);
		}
		return () => {
			setUser(null);
		};
	}, [userId, users]);

	// Function to render custom field value based on type
	const renderCustomFieldValue = (field, value) => {
		if (!value)
			return <Text type="secondary">{__("Not provided", "simplyconf")}</Text>;

		switch (field.type) {
			case "checkbox":
				return (
					<Tag color={value ? "green" : "default"}>
						{value ? __("Yes", "simplyconf") : __("No", "simplyconf")}
					</Tag>
				);
			case "date":
				return <Text>{new Date(value).toLocaleDateString()}</Text>;
			case "email":
				return <Text copyable>{value}</Text>;
			case "url":
				return (
					<a href={value} target="_blank" rel="noopener noreferrer">
						{value}
					</a>
				);
			case "select":
				return <Tag color="blue">{value}</Tag>;
			case "textarea":
				return (
					<div style={{ whiteSpace: "pre-wrap", maxWidth: "100%" }}>
						<Text>{value}</Text>
					</div>
				);
			case "file_upload":
				return <CustomFieldFileUpload field={field} value={value} disabled />;
			default:
				return <Text>{value}</Text>;
		}
	};

	if (!user) {
		return (
			<Card loading>
				<Text>{__("Loading user details...", "simplyconf")}</Text>
			</Card>
		);
	}

	// Format role display
	const roleDisplay = Array.isArray(user.roles)
		? user.roles.join(", ")
		: user.role || "viewer";

	return (
		<div data-testid="view-user-container">
			{/* Basic Information Card */}
			<Card
				data-testid="view-user-basic-info"
				size="small"
				title={
					<Space>
						<UserOutlined />
						<span>{__("User Information", "simplyconf")}</span>
					</Space>
				}
				style={{ marginBottom: 16 }}
			>
				<Row gutter={[16, 16]}>
					<Col span={12}>
						<Typography.Text type="secondary" style={{ display: "block" }}>
							<IdcardOutlined /> User ID
						</Typography.Text>
						<Typography.Text strong style={{ fontSize: 16 }}>
							{user.user_id}
						</Typography.Text>
					</Col>
					<Col span={12}>
						<Typography.Text type="secondary" style={{ display: "block" }}>
							<MailOutlined /> Email
						</Typography.Text>
						<Typography.Text strong copyable style={{ fontSize: 16 }}>
							{user.email}
						</Typography.Text>
					</Col>
				</Row>
				<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
					<Col span={12}>
						<Typography.Text type="secondary" style={{ display: "block" }}>
							<UserOutlined /> Display Name
						</Typography.Text>
						<Typography.Text strong style={{ fontSize: 16 }}>
							{user.display_name}
						</Typography.Text>
					</Col>
					<Col span={12}>
						<Typography.Text type="secondary" style={{ display: "block" }}>
							<SafetyOutlined /> Status
						</Typography.Text>
						<Tag
							color={user.status === "active" ? "green" : "default"}
							style={{ fontSize: 14 }}
						>
							{user.status}
						</Tag>
					</Col>
				</Row>
				<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
					<Col span={12}>
						<Typography.Text type="secondary" style={{ display: "block" }}>
							<SafetyOutlined /> Role
						</Typography.Text>
						<Tag color="blue" style={{ fontSize: 14 }}>
							{roleDisplay}
						</Tag>
					</Col>
					{user.created_at && (
						<Col span={12}>
							<Typography.Text type="secondary" style={{ display: "block" }}>
								<ClockCircleOutlined /> Created At
							</Typography.Text>
							<Typography.Text style={{ fontSize: 14 }}>
								{new Date(user.created_at).toLocaleString()}
							</Typography.Text>
						</Col>
					)}
				</Row>
			</Card>

			{/* Custom Fields Card */}
			{userCustomFields && userCustomFields.length > 0 && (
				<Card
					data-testid="view-user-custom-fields"
					size="small"
					title={
						<Space>
							<FileTextOutlined />
							<span>{__("Custom Fields", "simplyconf")}</span>
						</Space>
					}
					style={{ marginBottom: 16 }}
				>
					<Row gutter={[16, 16]}>
						{userCustomFields.map((field, _index) => {
							// Find the custom field value for this user
							const customFieldValue = user.custom_fields?.find(
								(cf) => cf.field_id === field.field_id,
							);
							const value = customFieldValue?.value;

							return (
								<Col span={12} key={field.field_id}>
									<Typography.Text
										type="secondary"
										style={{ display: "block" }}
									>
										{field.label}
									</Typography.Text>
									<div style={{ marginTop: 4 }}>
										{renderCustomFieldValue(field, value)}
									</div>
								</Col>
							);
						})}
					</Row>
				</Card>
			)}
		</div>
	);
};

ViewUser.propTypes = {
	onClose: PropTypes.func.isRequired,
};

export default ViewUser;
