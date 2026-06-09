/**
 * Registration Form Persistence Utility
 *
 * Handles saving and restoring registration form data to localStorage
 * to prevent data loss on page refresh or navigation.
 */

const REGISTRATION_STORAGE_KEY = "simplyconf_registration_data";
const REGISTRATION_STEP_KEY = "simplyconf_registration_step";

/**
 * Save registration form data to localStorage
 */
export const saveRegistrationData = (formData, currentStep) => {
	try {
		const dataToSave = {
			formData,
			currentStep,
			timestamp: Date.now(),
		};

		localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(dataToSave));
		localStorage.setItem(REGISTRATION_STEP_KEY, currentStep.toString());
	} catch (error) {
		console.warn("Failed to save registration data:", error);
	}
};

/**
 * Load registration form data from localStorage
 */
export const loadRegistrationData = () => {
	try {
		const stored = localStorage.getItem(REGISTRATION_STORAGE_KEY);
		const storedStep = localStorage.getItem(REGISTRATION_STEP_KEY);

		if (!stored || !storedStep) {
			return null;
		}

		const data = JSON.parse(stored);

		// Check if data is too old (24 hours)
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		if (Date.now() - data.timestamp > maxAge) {
			clearRegistrationData();
			return null;
		}

		return {
			formData: data.formData || {},
			currentStep: Number.parseInt(storedStep, 10) || 0,
		};
	} catch (error) {
		console.warn("Failed to load registration data:", error);
		return null;
	}
};

/**
 * Clear registration data from localStorage
 */
export const clearRegistrationData = () => {
	try {
		localStorage.removeItem(REGISTRATION_STORAGE_KEY);
		localStorage.removeItem(REGISTRATION_STEP_KEY);
	} catch (error) {
		console.warn("Failed to clear registration data:", error);
	}
};

/**
 * Check if there's saved registration data
 */
export const hasRegistrationData = () => {
	try {
		return localStorage.getItem(REGISTRATION_STORAGE_KEY) !== null;
	} catch (_error) {
		return false;
	}
};

/**
 * Save just the current step (for progress tracking)
 */
export const saveRegistrationStep = (step) => {
	try {
		localStorage.setItem(REGISTRATION_STEP_KEY, step.toString());
	} catch (error) {
		console.warn("Failed to save registration step:", error);
	}
};
