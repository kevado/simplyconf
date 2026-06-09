import ConditionalCustomFields from "@shared/customFields/ConditionalCustomFields";
import { __ } from "@wordpress/i18n";
import { Col, Form, Input, Row } from "antd";
import { useEffect, useState } from "react";

/**
 * Shared author form component used in both:
 * - Authors.js (admin author list page)
 * - AuthorManagement.js (abstract submission author management)
 */
const AuthorForm = ({
	form,
	customFields = [],
	initialAuthor = null,
	onFormValuesChange,
	onVisibleFieldsChange,
	disabled = false,
}) => {
	const [formValues, setFormValues] = useState({});

	// Initialize form values when author data is provided
	useEffect(() => {
		if (initialAuthor) {
			const initialValues = {
				first_name: initialAuthor.first_name,
				last_name: initialAuthor.last_name,
				email: initialAuthor.email,
			};

			// Add custom fields if they exist
			if (initialAuthor.custom_fields) {
				if (Array.isArray(initialAuthor.custom_fields)) {
					// Array format: [{ field_id, value }]
					initialAuthor.custom_fields.forEach((field) => {
						initialValues[field.field_id] = field.value;
					});
				} else {
					// Object format: { field_id: value }
					Object.keys(initialAuthor.custom_fields).forEach((fieldId) => {
						initialValues[fieldId] = initialAuthor.custom_fields[fieldId];
					});
				}
			}

			// Set form values
			form.setFieldsValue(initialValues);
			// Update formValues state for conditional logic
			setFormValues(initialValues);
		}
	}, [initialAuthor, form]);

	// Handle form value changes
	const _handleValuesChange = (changed, all) => {
		setFormValues(all);
		if (onFormValuesChange) {
			onFormValuesChange(changed, all);
		}
	};

	return (
		<>
			<Row gutter={16}>
				<Col span={12}>
					<Form.Item
						name="first_name"
						label={__("First Name", "simplyconf")}
						rules={[
							{
								required: true,
								message: __("Please enter first name", "simplyconf"),
							},
						]}
					>
						<Input
							data-testid="author-first-name-input"
							placeholder={__("Enter first name", "simplyconf")}
							disabled={disabled}
						/>
					</Form.Item>
				</Col>
				<Col span={12}>
					<Form.Item
						name="last_name"
						label={__("Last Name", "simplyconf")}
						rules={[
							{
								required: true,
								message: __("Please enter last name", "simplyconf"),
							},
						]}
					>
						<Input
							data-testid="author-last-name-input"
							placeholder={__("Enter last name", "simplyconf")}
							disabled={disabled}
						/>
					</Form.Item>
				</Col>
			</Row>

			<Form.Item
				name="email"
				label={__("Email", "simplyconf")}
				rules={[
					{
						required: true,
						message: __("Please enter email", "simplyconf"),
					},
					{
						type: "email",
						message: __("Please enter a valid email", "simplyconf"),
					},
				]}
			>
				<Input
					data-testid="author-email-input"
					placeholder={__("Enter email address", "simplyconf")}
					disabled={disabled}
				/>
			</Form.Item>

			{/* Custom Fields */}
			{customFields.length > 0 && (
				<ConditionalCustomFields
					fields={customFields}
					form={form}
					formValues={formValues}
					namePrefix=""
					disabled={disabled}
					onFieldsChange={onVisibleFieldsChange}
					entityType="author"
				/>
			)}
		</>
	);
};

export default AuthorForm;
