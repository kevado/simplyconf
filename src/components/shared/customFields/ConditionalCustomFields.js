import { useConditionalFields } from "@hooks/useConditionalFields";
import CustomFieldRenderer from "@shared/customFields/CustomFieldRenderer";
import PropTypes from "prop-types";
import { useEffect, useRef } from "react";

/**
 * Wrapper component that handles conditional logic for custom fields
 * Automatically shows/hides fields based on form values and clears hidden field data
 *
 * USAGE: Parent Form must have onValuesChange prop that updates formValues state
 *
 * @param {Array} fields - Array of custom field definitions
 * @param {Object} form - Ant Design form instance
 * @param {Object} formValues - Current form values (updated via parent's onValuesChange)
 * @param {string} namePrefix - Optional prefix for field names (e.g., 'custom_fields.')
 * @param {boolean} disabled - Whether fields should be disabled
 * @param {Function} onFieldsChange - Optional callback when visible fields change
 */
const ConditionalCustomFields = ({
	fields = [],
	form,
	formValues = {},
	namePrefix = "",
	disabled = false,
	onFieldsChange = null,
	entityType,
	entityId,
}) => {
	// Apply conditional logic to get visible fields
	const visibleFields = useConditionalFields(fields, formValues, namePrefix);

	// Track previous visible field IDs to prevent unnecessary updates
	const prevVisibleFieldIdsRef = useRef("");

	// Clear hidden field values
	useEffect(() => {
		if (!form || fields.length === 0) return;

		// Find fields that are no longer visible
		const hiddenFields = fields.filter(
			(field) =>
				!visibleFields.some(
					(visibleField) => visibleField.field_id === field.field_id,
				),
		);

		if (hiddenFields.length > 0) {
			// Clear values for hidden fields from form
			const fieldsToClear = {};
			hiddenFields.forEach((field) => {
				const fieldNames = [
					namePrefix ? `${namePrefix}${field.field_id}` : field.label,
					namePrefix
						? `${namePrefix}${field.name}`
						: field.field_id?.toString(),
					namePrefix ? `${namePrefix}${field.label}` : field.name,
				].filter(Boolean);

				fieldNames.forEach((fieldName) => {
					fieldsToClear[fieldName] = undefined;
				});
			});

			// Clear the form fields
			form.setFieldsValue(fieldsToClear);
		}
	}, [visibleFields, fields, form, namePrefix]);

	// Notify parent of visible fields changes - only when they actually change
	useEffect(() => {
		if (!onFieldsChange) return;

		// Create a stable string representation of visible field IDs
		const currentVisibleFieldIds = visibleFields
			.map((f) => f.field_id)
			.sort()
			.join(",");

		// Only call callback if the visible fields actually changed
		if (currentVisibleFieldIds !== prevVisibleFieldIdsRef.current) {
			prevVisibleFieldIdsRef.current = currentVisibleFieldIds;
			onFieldsChange(visibleFields);
		}
	}, [visibleFields, onFieldsChange]);

	if (!fields || fields.length === 0) {
		return null;
	}

	return (
		<>
			{visibleFields.map((field) => (
				<CustomFieldRenderer
					key={field.field_id}
					field={field}
					form={form}
					namePrefix={namePrefix}
					disabled={disabled}
					entityType={entityType}
					entityId={entityId}
				/>
			))}
		</>
	);
};

ConditionalCustomFields.propTypes = {
	fields: PropTypes.array,
	form: PropTypes.object.isRequired,
	formValues: PropTypes.object,
	namePrefix: PropTypes.string,
	disabled: PropTypes.bool,
	onFieldsChange: PropTypes.func,
	entityType: PropTypes.string,
	entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ConditionalCustomFields;
