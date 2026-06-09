import { notification } from "antd";

/**
 * Centralized feedback utilities using Ant Design notifications
 * These provide consistent, visible feedback at bottom-right of screen
 */

/**
 * Show success notification
 * @param {string} message - Main message text
 * @param {string|null} description - Optional detailed description
 */
export const showSuccess = (message, description = null) => {
	notification.success({
		message,
		description,
		placement: "bottomRight",
		duration: 4,
	});
};

/**
 * Show error notification
 * @param {string} message - Main error message
 * @param {string|null} description - Optional error details
 */
export const showError = (message, description = null) => {
	notification.error({
		message,
		description,
		placement: "bottomRight",
		duration: 6, // Longer duration for errors
	});
};

/**
 * Show warning notification
 * @param {string} message - Warning message
 * @param {string|null} description - Optional warning details
 */
export const showWarning = (message, description = null) => {
	notification.warning({
		message,
		description,
		placement: "bottomRight",
		duration: 5,
	});
};

/**
 * Show info notification
 * @param {string} message - Info message
 * @param {string|null} description - Optional info details
 */
export const showInfo = (message, description = null) => {
	notification.info({
		message,
		description,
		placement: "bottomRight",
		duration: 4,
	});
};
