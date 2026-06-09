// Import store directly instead of accessing via window
import { store } from "@state/index";

/**
 * Check if an add-on is registered and active
 * Now checks Redux feature flags for dynamic updates
 *
 * @param {string} slug - Add-on slug (e.g., 'reviews', 'emails', 'schedules')
 * @returns {boolean} True if add-on is active, false otherwise
 *
 * @example
 * if (hasAddon('reviews')) {
 *   // Show reviews feature
 * }
 */
export const hasAddon = (slug) => {
	// Check Redux store for feature flags (dynamic)
	try {
		const state = store.getState();
		const enabledFeatures = state?.features?.enabled || [];
		return enabledFeatures.includes(slug);
	} catch (_error) {
		// Fallback to window.simplyconf.features if store not initialized
		const features = window.simplyconf?.features || [];
		return features.includes(slug);
	}
};

/**
 * Get specific add-on data
 *
 * @param {string} slug - Add-on slug
 * @returns {object|null} Add-on data object or null if not found
 *
 * @example
 * const reviewsAddon = getAddon('reviews');
 * console.log(reviewsAddon.version); // "1.0.0"
 */
export const getAddon = (slug) => {
	const addons = window.simplyconf?.addons || {};
	return addons[slug] || null;
};

/**
 * Get all registered add-ons
 *
 * @returns {object} Object containing all add-ons keyed by slug
 *
 * @example
 * const allAddons = getAddons();
 * console.log(Object.keys(allAddons)); // ['reviews', 'emails', 'schedules']
 */
export const getAddons = () => {
	return window.simplyconf?.addons || {};
};

/**
 * Get array of active add-on slugs
 *
 * @returns {string[]} Array of active add-on slugs
 *
 * @example
 * const activeAddons = getActiveAddons();
 * // ['reviews', 'emails']
 */
export const getActiveAddons = () => {
	const addons = getAddons();
	return Object.keys(addons).filter((slug) => addons[slug]?.active === true);
};

/**
 * Get add-on version
 *
 * @param {string} slug - Add-on slug
 * @returns {string|null} Version string or null if add-on not found
 *
 * @example
 * const version = getAddonVersion('reviews');
 * console.log(version); // "1.0.0"
 */
export const getAddonVersion = (slug) => {
	const addon = getAddon(slug);
	return addon?.version || null;
};

/**
 * Get add-on name
 *
 * @param {string} slug - Add-on slug
 * @returns {string|null} Add-on name or null if not found
 *
 * @example
 * const name = getAddonName('reviews');
 * console.log(name); // "Reviews"
 */
export const getAddonName = (slug) => {
	const addon = getAddon(slug);
	return addon?.name || null;
};

/**
 * Check if any add-ons are active
 *
 * @returns {boolean} True if at least one add-on is active
 */
export const hasAnyAddons = () => {
	return getActiveAddons().length > 0;
};

/**
 * Check if multiple add-ons are all active
 *
 * @param {string[]} slugs - Array of add-on slugs to check
 * @returns {boolean} True if all specified add-ons are active
 *
 * @example
 * if (hasAddons(['reviews', 'emails'])) {
 *   // Both reviews and emails are active
 * }
 */
export const hasAddons = (slugs) => {
	return slugs.every((slug) => hasAddon(slug));
};

/**
 * Check if at least one of multiple add-ons is active
 *
 * @param {string[]} slugs - Array of add-on slugs to check
 * @returns {boolean} True if at least one specified add-on is active
 *
 * @example
 * if (hasAnyAddon(['reviews', 'emails'])) {
 *   // Either reviews or emails (or both) is active
 * }
 */
export const hasAnyAddon = (slugs) => {
	return slugs.some((slug) => hasAddon(slug));
};

/**
 * Higher-Order Component: Require add-on to render component
 *
 * Wraps a component and only renders it if the specified add-on is active.
 * Otherwise, renders a fallback component.
 *
 * @param {string} slug - Required add-on slug
 * @param {React.Component|null} FallbackComponent - Component to render if add-on is not active
 * @returns {Function} HOC function
 *
 * @example
 * const ReviewsPage = () => <div>{__('Reviews Content', 'simplyconf')}</div>;
 * const UpgradePrompt = () => <div>{__('Reviews add-on required', 'simplyconf')}</div>;
 *
 * export default requireAddon('reviews', UpgradePrompt)(ReviewsPage);
 */
export const requireAddon = (slug, FallbackComponent = null) => {
	return (Component) => {
		return (props) => {
			if (hasAddon(slug)) {
				return <Component {...props} />;
			}

			if (FallbackComponent) {
				return <FallbackComponent addon={slug} {...props} />;
			}

			return (
				<div style={{ padding: "20px", textAlign: "center" }}>
					<p>
						This feature requires the <strong>{slug}</strong> add-on.
					</p>
				</div>
			);
		};
	};
};

/**
 * React Hook: Get add-on status
 *
 * @param {string} slug - Add-on slug
 * @returns {object} Object with add-on data and status
 *
 * @example
 * const { isActive, addon, version } = useAddon('reviews');
 *
 * if (isActive) {
 *   return <ReviewsFeature />;
 * }
 */
export const useAddon = (slug) => {
	const addon = getAddon(slug);
	const isActive = hasAddon(slug);

	return {
		isActive,
		addon,
		version: addon?.version || null,
		name: addon?.name || null,
		hasAdmin: addon?.has_admin || false,
		hasFrontend: addon?.has_frontend || false,
	};
};

/**
 * React Hook: Get all add-ons status
 *
 * @returns {object} Object with add-ons data and counts
 *
 * @example
 * const { addons, activeCount, total } = useAddons();
 * console.log(`${activeCount} of ${total} add-ons active`);
 */
export const useAddons = () => {
	const addons = getAddons();
	const activeAddons = getActiveAddons();

	return {
		addons,
		activeAddons,
		activeCount: activeAddons.length,
		total: Object.keys(addons).length,
		hasAny: activeAddons.length > 0,
	};
};

/**
 * Conditional render component based on add-on
 * Now uses useFeature hook for reactive updates
 *
 * @param {object} props - Component props
 * @param {string} props.addon - Required add-on slug
 * @param {React.ReactNode} props.children - Content to render if add-on is active
 * @param {React.ReactNode} props.fallback - Content to render if add-on is not active
 * @returns {React.ReactNode}
 *
 * @example
 * <AddonGate addon="reviews" fallback={<UpgradePrompt />}>
 *   <ReviewsFeature />
 * </AddonGate>
 */
export const AddonGate = ({ addon, children, fallback = null }) => {
	// Import useFeature hook dynamically to avoid circular dependency
	const { useFeature } = require("@hooks/useFeature");
	const hasFeature = useFeature(addon);

	if (hasFeature) {
		return children;
	}

	return fallback;
};

/**
 * Debug helper: Log all add-ons to console
 * Only works when WP_DEBUG is enabled
 */
export const debugAddons = () => {
	if (!window.simplyconf?.debug) {
		return;
	}

	const addons = getAddons();
	const activeAddons = getActiveAddons();

	console.group("SimplyConf Add-Ons");
	console.log("Total:", Object.keys(addons).length);
	console.log("Active:", activeAddons.length);
	console.log("Add-ons:", addons);
	console.groupEnd();
};

// Auto-run debug on load if WP_DEBUG is enabled
if (window.simplyconf?.debug) {
	debugAddons();
}
