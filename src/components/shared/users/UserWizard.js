import { fetchCustomFields, selectUserFields } from "@state/customFieldsSlice";
import { updateUser } from "@state/userSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Button, Form, Select } from "antd";
import PropTypes from "prop-types";
/* eslint-disable no-mixed-spaces-and-tabs */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ConditionalCustomFields from "../customFields/ConditionalCustomFields";

const { Option } = Select;

const UserWizard = ({ userId: propUserId, onClose, hideFooter = false }) => {
	const dispatch = useDispatch();

	// Use userId from props (admin) or from Redux state
	const userId = propUserId;

	const [_user, setUser] = useState(null);
	const [customFieldForm] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [formValues, setFormValues] = useState({});
	const [visibleFields, setVisibleFields] = useState([]);

	// Redux state
	const { eventId, users, userCustomFields } = useSelector((state) => ({
		eventId: state.events.globalId,
		users: state.users.users,
		userCustomFields: selectUserFields(state),
	}));

	// Fetch custom fields on mount or when eventId changes
	useEffect(() => {
		dispatch(fetchCustomFields({ event_id: eventId, usage: "user" }));
	}, [dispatch, eventId]);

	// Load user data for edit mode
	useEffect(() => {
		if (userId && users && users[userId]) {
			const _user = users[userId];
			setUser(_user);

			// Populate custom field form with existing values
			if (
				_user.custom_fields &&
				Array.isArray(_user.custom_fields) &&
				userCustomFields
			) {
				const initialValues = {};

				_user.custom_fields.forEach((field) => {
					const fieldDef = userCustomFields.find(
						(f) =>
							Number.parseInt(f.field_id, 10) ===
							Number.parseInt(field.field_id, 10),
					);
					if (fieldDef) {
						let fieldValue = field.value;

						// Handle special field types that might need value conversion
						if (
							fieldDef.type === "checkbox" &&
							typeof fieldValue === "string"
						) {
							// Convert comma-separated string to array for checkbox groups
							fieldValue = fieldValue
								.split(",")
								.map((v) => v.trim())
								.filter((v) => v);
						}
						// Note: Date fields will be handled as strings by default

						initialValues[fieldDef.field_id] = fieldValue;
					}
				});
				customFieldForm.setFieldsValue(initialValues);
				setFormValues(initialValues);
			}
		}
	}, [userId, users, userCustomFields, customFieldForm]);

	// Ensure userId is provided for editing (checked after hooks to comply with rules of hooks)
	if (!userId) {
		console.error("UserWizard: userId is required for editing users");
		return <div>{__("Error: User ID is required", "simplyconf")}</div>;
	}

	const onSubmit = async () => {
		setLoading(true);
		try {
			// Get custom field values - only for visible fields
			const customFieldValues = customFieldForm.getFieldsValue();
			const custom_fields = visibleFields.map((field) => ({
				field_id: field.field_id,
				value: customFieldValues[field.field_id] || "",
			}));

			// Update existing user
			await dispatch(
				updateUser({
					userId,
					payload: {
						custom_fields,
					},
				}),
			).unwrap();
			showSuccess(__("User updated successfully!", "simplyconf"));

			if (onClose) {
				onClose();
			}
		} catch (error) {
			console.error("Error submitting user:", error);
			showError(__("Failed to update user", "simplyconf"));
		} finally {
			setLoading(false);
		}
	};

	if (!userCustomFields) {
		return <div>{__("Loading custom fields...", "simplyconf")}</div>;
	}

	return (
		<div style={{ maxWidth: "auto", margin: "0 auto", padding: 24 }}>
			<Form
				id="user-wizard-form"
				data-testid="user-wizard-form"
				form={customFieldForm}
				onFinish={onSubmit}
				layout="vertical"
				onValuesChange={(_changed, all) => setFormValues(all)}
			>
				{userCustomFields && userCustomFields.length > 0 ? (
					<ConditionalCustomFields
						fields={userCustomFields}
						form={customFieldForm}
						formValues={formValues}
						disabled={false}
						onFieldsChange={setVisibleFields}
						entityType="user"
						entityId={userId}
					/>
				) : (
					<div>{__("No custom fields available for users.", "simplyconf")}</div>
				)}

				{!hideFooter && (
					<div style={{ marginTop: 24, textAlign: "right" }}>
						<Button
							data-testid="user-wizard-cancel-btn"
							style={{ marginRight: 8 }}
							onClick={onClose}
						>
							{__("Cancel", "simplyconf")}
						</Button>
						<Button
							data-testid="user-wizard-submit-btn"
							type="primary"
							htmlType="submit"
							loading={loading}
						>
							{__("Update User", "simplyconf")}
						</Button>
					</div>
				)}
			</Form>
		</div>
	);
};

UserWizard.propTypes = {
	userId: PropTypes.number,
	onClose: PropTypes.func,
	hideFooter: PropTypes.bool,
};

export default UserWizard;
