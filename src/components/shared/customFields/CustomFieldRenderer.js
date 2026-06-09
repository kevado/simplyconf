import { __ } from "@wordpress/i18n";
import {
	Checkbox,
	Form,
	Input,
	InputNumber,
	Radio,
	Rate,
	Select,
	Typography,
} from "antd";
import PropTypes from "prop-types";
import { sprintf } from "sprintf-js";
import CustomFieldFileUpload from "./CustomFieldFileUpload";

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

/**
 * Unified renderer for all custom field types
 * Supports legacy and new field types with consistent validation and styling
 */
function CustomFieldRenderer({
	field,
	value,
	onChange,
	disabled = false,
	formInstance = null,
	form = null,
	namePrefix = "",
	entityType,
	entityId,
}) {
	const {
		type,
		name,
		label,
		description,
		required,
		options,
		config = {},
		field_id,
	} = field;

	// Helper function to safely convert values to numbers
	const toNumber = (value, fallback = undefined) => {
		if (value === undefined || value === null || value === "") {
			return fallback;
		}
		const num = Number(value);
		return Number.isNaN(num) ? fallback : num;
	};

	// Convert required to boolean if it's a string (from database)
	const isRequired =
		typeof required === "string"
			? required === "1" || required === "true"
			: !!required;

	// Determine if we should use Form.Item wrapper
	const shouldUseFormItem = form || formInstance;

	// Use field_id as field name for stability (won't break if label changes)
	// Apply namePrefix if provided (for nested structures)
	const fieldName = namePrefix ? `${namePrefix}${field_id}` : String(field_id);

	// Handle value changes
	const handleChange = (newValue) => {
		if (onChange) {
			onChange(fieldName, newValue);
		} else if (form && typeof form.setFieldsValue === "function") {
			// If no onChange handler but we have a form, update the form directly
			form.setFieldsValue({ [fieldName]: newValue });
		}
	};

	// Get current value from form if available, otherwise use provided value
	const getCurrentValue = () => {
		if (value !== undefined) {
			return value;
		}
		if (form && typeof form.getFieldValue === "function") {
			try {
				return form.getFieldValue(fieldName);
			} catch (_error) {
				// Silently handle form not being ready yet
				return undefined;
			}
		}
		return undefined;
	};

	const currentValue = getCurrentValue();

	// Common form item props
	const formItemProps = {
		label,
		name: fieldName,
		required: isRequired,
		help: description,
		rules: [
			{
				required: isRequired,
				message: sprintf(__("Please provide %s", "simplyconf"), label),
			},
		],
	};

	// Parse options if it's a string
	const parsedOptions = (() => {
		if (Array.isArray(options)) {
			return options;
		}
		if (typeof options === "string" && options.trim()) {
			// Try different delimiters: newline, comma, pipe
			let delimiter = "\n";
			if (options.includes(",") && !options.includes("\n")) {
				delimiter = ",";
			} else if (
				options.includes("|") &&
				!options.includes("\n") &&
				!options.includes(",")
			) {
				delimiter = "|";
			}
			return options
				.split(delimiter)
				.map((opt) => opt.trim())
				.filter((opt) => opt);
		}
		return [];
	})();

	// Render based on field type
	const renderField = () => {
		switch (type) {
			case "text": {
				return (
					<Input
						data-testid={`custom-field-${fieldName}`}
						placeholder={
							config.placeholder || sprintf(__("Enter %s", "simplyconf"), label)
						}
						maxLength={config.maxLength}
						value={currentValue}
						onChange={(e) => handleChange(e.target.value)}
						disabled={disabled}
					/>
				);
			}

			case "textarea": {
				return (
					<TextArea
						data-testid={`custom-field-${fieldName}`}
						placeholder={
							config.placeholder || sprintf(__("Enter %s", "simplyconf"), label)
						}
						rows={config.rows || 4}
						maxLength={config.maxLength}
						value={currentValue}
						onChange={(e) => handleChange(e.target.value)}
						disabled={disabled}
					/>
				);
			}

			case "email": {
				return (
					<Input
						data-testid={`custom-field-${fieldName}`}
						type="email"
						placeholder={
							config.placeholder || sprintf(__("Enter %s", "simplyconf"), label)
						}
						value={currentValue}
						onChange={(e) => handleChange(e.target.value)}
						disabled={disabled}
					/>
				);
			}

			case "number": {
				// Ensure all numeric values are properly converted to numbers
				const min = toNumber(config.min);
				const max = toNumber(config.max);
				const step = toNumber(config.step, 1);
				// Ensure currentValue is a number or undefined
				const numericValue = toNumber(currentValue);

				return (
					<InputNumber
						data-testid={`custom-field-${fieldName}`}
						placeholder={
							config.placeholder || sprintf(__("Enter %s", "simplyconf"), label)
						}
						min={min}
						max={max}
						step={step}
						value={numericValue}
						onChange={handleChange}
						disabled={disabled}
						style={{ width: "100%" }}
					/>
				);
			}

			case "select": {
				return (
					<Select
						data-testid={`custom-field-${fieldName}`}
						placeholder={
							config.placeholder ||
							sprintf(__("Select %s", "simplyconf"), label)
						}
						value={currentValue}
						onChange={handleChange}
						disabled={disabled}
						allowClear
					>
						{parsedOptions.map((option, index) => (
							<Option key={index} value={option.trim()}>
								{option.trim()}
							</Option>
						))}
					</Select>
				);
			}

			case "radio": {
				// For Form.Item integration, don't handle onChange manually when form context exists
				const radioGroupProps = shouldUseFormItem
					? {}
					: {
							value: currentValue,
							onChange: (e) => handleChange(e.target.value),
						};

				return (
					<Radio.Group
						data-testid={`custom-field-${fieldName}`}
						{...radioGroupProps}
						disabled={disabled}
					>
						{parsedOptions.map((option, index) => (
							<Radio key={index} value={option.trim()}>
								{option.trim()}
							</Radio>
						))}
					</Radio.Group>
				);
			}

			case "checkbox": {
				// If options are provided, render as checkbox group
				if (parsedOptions.length > 0) {
					return (
						<Checkbox.Group
							data-testid={`custom-field-${fieldName}`}
							value={currentValue || []}
							onChange={handleChange}
							disabled={disabled}
						>
							{parsedOptions.map((option, index) => (
								<Checkbox key={index} value={option.trim()}>
									{option.trim()}
								</Checkbox>
							))}
						</Checkbox.Group>
					);
				}

				// Single checkbox
				return (
					<Checkbox
						data-testid={`custom-field-${fieldName}`}
						checked={currentValue}
						onChange={(e) => handleChange(e.target.checked)}
						disabled={disabled}
					>
						{config.checkboxLabel || label}
					</Checkbox>
				);
			}

			case "rating": {
				const ratingConfig = config.rating || {};
				// Use field properties first, then config, then defaults
				const maxRating = toNumber(
					field.max_rating || ratingConfig.maxRating,
					5,
				);
				// Ensure currentValue is a number for Rate component
				const numericValue = toNumber(currentValue);

				return (
					<Rate
						data-testid={`custom-field-${fieldName}`}
						count={maxRating}
						allowHalf={ratingConfig.allowHalf || false}
						allowClear={ratingConfig.allowClear !== false}
						value={numericValue}
						onChange={handleChange}
						disabled={disabled}
						tooltips={ratingConfig.tooltips}
					/>
				);
			}

			case "file_upload": {
				// File upload manages its own value via Redux; pass value/onChange
				// only when NOT wrapped in Form.Item (Form.Item injects them automatically)
				const fileUploadProps = shouldUseFormItem
					? {}
					: { value: currentValue, onChange: handleChange };
				return (
					<CustomFieldFileUpload
						field={field}
						{...fileUploadProps}
						disabled={disabled}
						entityType={entityType}
						entityId={entityId}
					/>
				);
			}

			default: {
				console.warn(`Unknown field type: ${type}`);
				return (
					<Input
						data-testid={`custom-field-${fieldName}`}
						placeholder={sprintf(__("Enter %s", "simplyconf"), label)}
						value={currentValue}
						onChange={(e) => handleChange(e.target.value)}
						disabled={disabled}
					/>
				);
			}
		}
	};

	// Wrap in Form.Item for consistent styling and validation
	// Only use Form.Item if we have a proper form context

	if (shouldUseFormItem) {
		// Determine the correct valuePropName based on field type and options
		const getValuePropName = () => {
			if (type === "checkbox") {
				// If checkbox has options, it's a checkbox group (uses 'value')
				// If no options, it's a single checkbox (uses 'checked')
				return parsedOptions.length > 0 ? "value" : "checked";
			}
			if (type === "switch") {
				return "checked";
			}
			return "value";
		};

		return (
			<Form.Item {...formItemProps} valuePropName={getValuePropName()}>
				{renderField()}
			</Form.Item>
		);
	}
	// Return field without Form.Item wrapper when no form context
	return (
		<div style={{ marginBottom: 16 }}>
			{label && (
				<div style={{ marginBottom: 8, fontWeight: 500 }}>
					{label} {isRequired && <span style={{ color: "red" }}>*</span>}
				</div>
			)}
			{renderField()}
			{description && (
				<div style={{ marginTop: 4, fontSize: "12px", color: "#666" }}>
					{description}
				</div>
			)}
		</div>
	);
}

CustomFieldRenderer.propTypes = {
	field: PropTypes.shape({
		type: PropTypes.string.isRequired,
		name: PropTypes.string,
		field_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		label: PropTypes.string.isRequired,
		description: PropTypes.string,
		required: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
		options: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
		config: PropTypes.object,
		max_rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		help_text: PropTypes.string,
	}).isRequired,
	value: PropTypes.any,
	onChange: PropTypes.func,
	disabled: PropTypes.bool,
	formInstance: PropTypes.object,
	form: PropTypes.object,
	namePrefix: PropTypes.string,
	entityType: PropTypes.string,
	entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CustomFieldRenderer;
