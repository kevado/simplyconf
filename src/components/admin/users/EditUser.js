import ConditionalCustomFields from "@shared/customFields/ConditionalCustomFields";
import { fetchCustomFields, selectUserFields } from "@state/customFieldsSlice";
import { updateUser } from "@state/userSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Button, Card, Form, Select } from "antd";
import PropTypes from "prop-types";
/* eslint-disable no-mixed-spaces-and-tabs */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Option } = Select;

const EditUser = ({ onClose }) => {
	const dispatch = useDispatch();
	// Using feedback utilities
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [customFieldForm] = Form.useForm();
	const [formValues, setFormValues] = useState({});
	const [visibleFields, setVisibleFields] = useState([]);

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
			const _user = users[userId];
			setUser(_user);

			// Populate custom field form with existing values
			if (_user.custom_fields && userCustomFields) {
				const initialValues = {};
				_user.custom_fields.forEach((field) => {
					const fieldDef = userCustomFields.find(
						(f) => f.field_id === field.field_id,
					);
					if (fieldDef) {
						initialValues[fieldDef.field_id] = field.value;
					}
				});
				customFieldForm.setFieldsValue(initialValues);
				// Update formValues state so conditional logic evaluates correctly
				setFormValues(initialValues);
			}
		}
		return () => {
			setUser(null);
		};
	}, [userId, users, userCustomFields, customFieldForm]);

	const onSubmit = async () => {
		try {
			setLoading(true);

			// Get custom field values - only for visible fields
			const customFieldValues = customFieldForm.getFieldsValue();
			const custom_fields = visibleFields.map((field) => ({
				field_id: field.field_id,
				value: customFieldValues[field.field_id] || "",
			}));

			dispatch(
				updateUser({
					userId,
					payload: {
						custom_fields,
					},
				}),
			).unwrap();

			showSuccess(__("User updated successfully", "simplyconf"));
			onClose();
		} catch (error) {
			console.error("Error updating user:", error);
			showError(__("Failed to update user", "simplyconf"));
		} finally {
			setLoading(false);
		}
	};

	if (!userCustomFields) {
		return <div>{__("Loading custom fields...", "simplyconf")}</div>;
	}

	if (!user) {
		return (
			<Card loading>
				<div>{__("Loading user details...", "simplyconf")}</div>
			</Card>
		);
	}

	return (
		<div style={{ maxWidth: "auto", margin: "0 auto", padding: 24 }}>
			<Form
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
				<div style={{ marginTop: 24, textAlign: "right" }}>
					<Button style={{ marginRight: 8 }} onClick={onClose}>
						{__("Cancel", "simplyconf")}
					</Button>
					<Button type="primary" htmlType="submit" loading={loading}>
						{__("Update User", "simplyconf")}
					</Button>
				</div>
			</Form>
		</div>
	);
};

EditUser.propTypes = {
	onClose: PropTypes.func.isRequired,
};

export default EditUser;
