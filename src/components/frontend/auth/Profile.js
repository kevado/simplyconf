import ConditionalCustomFields from "@shared/customFields/ConditionalCustomFields";
import { fetchCustomFields, selectUserFields } from "@state/customFieldsSlice";
import { getProfile, updateProfile } from "@state/frontendSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Button, Card, Form, Spin } from "antd";
/* eslint-disable no-mixed-spaces-and-tabs */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const Profile = () => {
	const dispatch = useDispatch();
	const eventId = window.simplyconf?.eventId || null;
	const [loading, setLoading] = useState(false);
	const [customFieldForm] = Form.useForm();
	const [formValues, setFormValues] = useState({});
	const [visibleFields, setVisibleFields] = useState([]);

	const { profile, isLoading } = useSelector((state) => state.frontend);
	const userCustomFields = useSelector(selectUserFields);

	useEffect(() => {
		dispatch(getProfile());
		if (eventId) {
			dispatch(fetchCustomFields({ event_id: eventId, usage: "user" }));
		}
	}, [dispatch, eventId]);

	useEffect(() => {
		if (profile && userCustomFields) {
			// Populate custom field form with existing values
			if (
				profile.custom_fields &&
				Array.isArray(profile.custom_fields) &&
				userCustomFields
			) {
				const initialValues = {};

				profile.custom_fields.forEach((field) => {
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
				// Update formValues state so conditional logic evaluates correctly
				setFormValues(initialValues);
			}
		}
	}, [profile, userCustomFields, customFieldForm]);

	const onProfileSubmit = async () => {
		try {
			setLoading(true);

			// Get custom field values - only for visible fields
			const customFieldValues = customFieldForm.getFieldsValue();
			const custom_fields = visibleFields.map((field) => ({
				field_id: field.field_id,
				value: customFieldValues[String(field.field_id)] || "",
			}));

			await dispatch(updateProfile({ custom_fields })).unwrap();
			showSuccess(__("Profile updated!", "simplyconf"));
		} catch (e) {
			console.error("Error updating profile:", e);
			showError(__("Failed to update profile", "simplyconf"));
		} finally {
			setLoading(false);
		}
	};

	if (isLoading || !profile) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16 }}>
					{__("Loading profile...", "simplyconf")}
				</div>
			</div>
		);
	}

	if (!userCustomFields) {
		return (
			<Card title={__("My Profile", "simplyconf")} size="large">
				<div style={{ textAlign: "center", padding: "40px" }}>
					<Spin size="large" />
					<div style={{ marginTop: 16 }}>
						{__("Loading custom fields...", "simplyconf")}
					</div>
				</div>
			</Card>
		);
	}

	return (
		<Card title={__("My Profile", "simplyconf")} size="large">
			<div style={{ maxWidth: "auto", margin: "0 auto", padding: 24 }}>
				<Form
					form={customFieldForm}
					onFinish={onProfileSubmit}
					layout="vertical"
					onValuesChange={(_changed, all) => setFormValues(all)}
				>
					{userCustomFields && userCustomFields.length > 0 ? (
						<ConditionalCustomFields
							fields={userCustomFields.filter(
								(field) => Number.parseInt(field.show_in_frontend, 10) !== 0,
							)}
							form={customFieldForm}
							formValues={formValues}
							namePrefix="" // No prefix - use field_id
							disabled={false}
							onFieldsChange={setVisibleFields}
							entityType="user"
							entityId={profile?.user_id || profile?.ID}
						/>
					) : (
						<div>
							{__("No custom fields available for your profile.", "simplyconf")}
						</div>
					)}

					<div style={{ marginTop: 24, textAlign: "right" }}>
						<Button type="primary" htmlType="submit" loading={loading}>
							{__("Update Profile", "simplyconf")}
						</Button>
					</div>
				</Form>
			</div>
		</Card>
	);
};

export default Profile;
