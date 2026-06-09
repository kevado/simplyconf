import uuid from "react-uuid";
import axiosInstance from "./axios";

// Export add-on utilities
export * from "./addons";
// Export axios for add-ons
export { default as axios } from "./axios";
export * from "./download";
export * from "./feedback";
export * from "./index";
export { default as logger } from "./logger";
export { axiosInstance };

// Export WYSIWYG Editor for use across all addons
export {
	default as WYSIWYGEditor,
	getPlainTextFromHTML,
	getWordCount,
	insertTextAtCursor,
} from "./WYSIWYGEditor";

export const upperFirst = (string) => {
	return string[0].toUpperCase() + string.slice(1);
};

export const getUUID = () => {
	return uuid();
};

/**
 * Determines if the current context is WordPress admin vs frontend dashboard
 * Uses multiple detection methods for reliability
 * @returns {boolean} true if in WordPress admin, false if in frontend dashboard
 */
export const isWordPressAdmin = () => {
	// Method 1: Check for WordPress admin-specific DOM elements
	const adminElement = document.getElementById("simplyconf-admin");
	const dashboardElement = document.getElementById("simplyconf-dashboard");

	// Method 2: Check URL for admin.php
	const isAdminUrl = window.location.href.includes("/wp-admin/");

	// Method 3: Check for WordPress admin body class
	const hasAdminBodyClass = document.body?.classList?.contains("wp-admin");

	// Method 4: Check current URL pathname
	const isAdminPath = window.location.pathname.includes("/wp-admin/");

	const result =
		(!!adminElement && !dashboardElement) ||
		isAdminUrl ||
		hasAdminBodyClass ||
		isAdminPath;

	return result;
};

/**
 * Navigate to submissions page - handles both admin and frontend contexts
 * @param {Function} navigate - React Router navigate function (optional for admin)
 * @param {string} target - Target page: 'submissions' or 'abstracts' (default: 'submissions')
 */
export const navigateToSubmissions = (navigate, target = "submissions") => {
	// Always check admin status at navigation time, not at component mount
	if (isWordPressAdmin()) {
		// Admin: use full page reload to WordPress admin
		window.location.href = `/wp-admin/admin.php?page=simplyconf#/${target}`;
	} else {
		// Frontend: use React Router navigation
		if (navigate) {
			navigate(`/${target}`);
		}
	}
};
