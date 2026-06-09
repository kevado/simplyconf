import { getPublicUserSettings, getSettings } from "@state/settingSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

/**
 * Convert a value to a proper boolean
 * Standardized approach: handle string "1"/"0" and boolean true/false
 */
const convertToBoolean = (value) => {
	if (typeof value === "boolean") {
		return value;
	}
	// Handle database string values "1"/"0"
	if (typeof value === "string") {
		return value === "1";
	}
	// Handle numeric values 1/0
	if (typeof value === "number") {
		return value === 1;
	}
	return false;
};

/**
 * Get user settings from Redux store
 */
export const useUserSettings = () => {
	const { settings } = useSelector((state) => ({
		settings: state.settings.settings.user || [],
	}));

	// Convert settings array to object for easy access
	const settingsObject = settings.reduce((acc, setting) => {
		acc[setting.name] = {
			value:
				setting.type === "boolean"
					? convertToBoolean(setting.value)
					: setting.type === "number"
						? Number.parseInt(setting.value, 10) || 0
						: setting.value,
			setting_id: setting.setting_id,
			type: setting.type,
		};
		return acc;
	}, {});

	return settingsObject;
};

/**
 * Check if user registration is enabled
 */
export const useRegistrationEnabled = () => {
	const userSettings = useUserSettings();
	return userSettings.enable_user_registration?.value === true;
};

/**
 * Get password requirements - tries public API first, then falls back to defaults
 */
export const usePasswordRequirements = () => {
	const userSettings = useUserSettings();

	return {
		minLength: userSettings.password_min_length?.value ?? 8,
		maxLength: userSettings.password_max_length?.value ?? 128,
		requireUppercase: userSettings.password_require_uppercase?.value !== false,
		requireLowercase: userSettings.password_require_lowercase?.value !== false,
		requireNumbers: userSettings.password_require_numbers?.value !== false,
		requireSymbols: userSettings.password_require_symbols?.value !== false,
	};
};

/**
 * Smart hook that fetches user settings - tries public API first for unauthenticated users
 */
export const useSmartUserSettings = () => {
	const dispatch = useDispatch();
	const eventId = useSelector((state) => state.events.globalId);
	const { settings, isLoading, hasError } = useSelector(
		(state) => state.settings,
	);
	const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

	// Fetch settings when component mounts
	useEffect(() => {
		if (eventId && settings.user.length === 0) {
			if (isAuthenticated) {
				// User is logged in, use authenticated API
				dispatch(getSettings(eventId));
			} else {
				// User is not logged in, use public API
				dispatch(getPublicUserSettings(eventId));
			}
		}
	}, [dispatch, eventId, isAuthenticated, settings.user.length]);

	return { settings, isLoading, hasError };
};

/**
 * Validate password against requirements
 */
export const validatePassword = (password, requirements) => {
	const errors = [];

	// Length validation
	if (
		password.length < requirements.minLength ||
		password.length > requirements.maxLength
	) {
		errors.push(
			`Password must be at least ${requirements.minLength} characters and no more than ${requirements.maxLength} characters`,
		);
	}

	if (requirements.requireLowercase && !/[a-z]/.test(password)) {
		errors.push("Password must contain at least one lowercase letter");
	}
	if (requirements.requireNumbers && !/\d/.test(password)) {
		errors.push("Password must contain at least one number");
	}
	if (
		requirements.requireSymbols &&
		!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
	) {
		errors.push("Password must contain at least one special character");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

/**
 * Calculate password strength
 */
export const calculatePasswordStrength = (password, requirements) => {
	if (!password) return { score: 0, label: "Very Weak", color: "#ff4d4f" };

	let score = 0;
	const feedback = [];

	// Length scoring
	if (password.length >= requirements.minLength) score += 1;
	if (password.length >= requirements.minLength * 1.5) score += 1;
	if (password.length >= requirements.maxLength * 0.8) score += 1;

	// Character variety scoring
	if (/[a-z]/.test(password)) {
		score += 1;
		feedback.push("lowercase");
	}
	if (/[A-Z]/.test(password)) {
		score += 1;
		feedback.push("uppercase");
	}
	if (/\d/.test(password)) {
		score += 1;
		feedback.push("numbers");
	}
	if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
		score += 1;
		feedback.push("symbols");
	}

	// Determine strength label and color
	let label;
	let color;
	if (score <= 2) {
		label = "Weak";
		color = "#ff4d4f";
	} else if (score <= 4) {
		label = "Fair";
		color = "#faad14";
	} else if (score <= 6) {
		label = "Good";
		color = "#52c41a";
	} else {
		label = "Strong";
		color = "#1890ff";
	}

	return { score, label, color, feedback };
};
