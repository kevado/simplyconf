import { useMemo } from "react";

/**
 * Evaluates conditional logic for custom fields and returns visible field objects
 *
 * @param {Array} fields - Array of custom field objects with conditional_logic property (can be JSON string or parsed object)
 * @param {Object} formValues - Object with current form values (key = field_id, value = field value)
 * @param {string} namePrefix - Optional prefix for field names (e.g., 'custom_')
 * @returns {Array} - Array of field objects that should be visible
 */
export const useConditionalFields = (fields, formValues, namePrefix = "") => {
	return useMemo(() => {
		const visibleFields = [];

		// Safety check: return empty array if fields is undefined or not an array
		if (!fields || !Array.isArray(fields)) {
			return visibleFields;
		}

		fields.forEach((field) => {
			try {
				// Parse conditional logic if it exists
				let logic = null;
				if (
					field.conditional_logic &&
					typeof field.conditional_logic === "string"
				) {
					try {
						logic = JSON.parse(field.conditional_logic);
					} catch (parseError) {
						console.warn(
							`Failed to parse conditional logic for field ${field.field_id}:`,
							parseError,
						);
					}
				} else if (
					field.conditional_logic &&
					typeof field.conditional_logic === "object"
				) {
					logic = field.conditional_logic;
				}

				// If field has no conditional logic or it's disabled, it's always visible
				if (!logic || !logic.enabled) {
					visibleFields.push(field);
					return;
				}

				// Evaluate all rules
				let rulesMet = logic.logic !== "any"; // Default to true for "all", false for "any"

				for (const rule of logic.rules) {
					// Find the field that this rule references to get the correct form field name
					const triggerField = fields.find(
						(f) => String(f.field_id) === String(rule.field_id),
					);
					if (!triggerField) {
						console.warn(`Rule references unknown field_id: ${rule.field_id}`);
						continue;
					}

					// Use the same field name logic as CustomFieldRenderer
					// Use field_id for stability (won't break if label changes)
					const triggerFieldName = namePrefix
						? `${namePrefix}${triggerField.field_id}`
						: String(triggerField.field_id);
					const triggerValue = formValues[triggerFieldName];

					let ruleMet = false;

					switch (rule.operator) {
						case "equals":
							ruleMet = triggerValue === rule.value;
							break;
						case "not_equals":
							ruleMet = triggerValue !== rule.value;
							break;
						case "contains":
							ruleMet = triggerValue?.includes(rule.value);
							break;
						case "is_empty":
							ruleMet = !triggerValue || triggerValue === "";
							break;
						case "is_not_empty":
							ruleMet = triggerValue && triggerValue !== "";
							break;
						default:
							ruleMet = false;
					}

					if (logic.logic === "all") {
						rulesMet = rulesMet && ruleMet;
					} else {
						// 'any'
						rulesMet = rulesMet || ruleMet;
					}
				}

				// Apply action
				const shouldShow = logic.action === "show" ? rulesMet : !rulesMet;

				if (shouldShow) {
					visibleFields.push(field);
				}
			} catch (error) {
				console.error(
					`Error evaluating conditional logic for field ${field.field_id}:`,
					error,
				);
				// If there's an error, show the field by default
				visibleFields.push(field);
			}
		});

		return visibleFields;
	}, [fields, formValues, namePrefix]);
};

export default useConditionalFields;

/**
 * Hook that combines custom fields with conditional logic to return visible fields with values
 * Use this for view/edit contexts where you need field values attached
 *
 * @param {Array} customFields - Array of custom field definitions
 * @param {Object} formValues - Current form values for conditional evaluation
 * @param {Array} savedCustomFields - Saved field values (for view/edit modes)
 * @returns {Array} Array of visible custom fields with their values attached
 */
export const useVisibleCustomFields = (
	customFields,
	formValues,
	savedCustomFields = null,
) => {
	const visibleFieldConfigs = useConditionalFields(customFields, formValues);

	return useMemo(() => {
		// If we have saved data, attach values to visible fields
		if (savedCustomFields && Array.isArray(savedCustomFields)) {
			return visibleFieldConfigs
				.map((fieldConfig) => {
					const savedField = savedCustomFields.find(
						(saved) => String(saved.field_id) === String(fieldConfig.field_id),
					);
					return savedField
						? { ...fieldConfig, value: savedField.value }
						: null;
				})
				.filter(Boolean);
		}

		// For form rendering, just return the visible field configurations
		return visibleFieldConfigs;
	}, [visibleFieldConfigs, savedCustomFields]);
};
