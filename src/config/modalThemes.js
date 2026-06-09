/**
 * Centralized Modal Theme Configuration
 *
 * Define gradient colors for different modal types.
 * This makes it easy to update colors across all modals in one place.
 */

export const MODAL_GRADIENTS = {
	events: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	sessions: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	tracks: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	authors: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	abstracts: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	reviews: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	users: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	settings: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

	default: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
};

/**
 * Get gradient for a specific modal type
 * @param {string} type - The modal type (e.g., 'events', 'tracks', 'authors')
 * @returns {string} The gradient CSS string
 */
export const getModalGradient = (type) => {
	return MODAL_GRADIENTS[type] || MODAL_GRADIENTS.default;
};

export default MODAL_GRADIENTS;
