import { selectHasFeature } from "@state/featureSlice";
import { useSelector } from "react-redux";

/**
 * React hook to check if a feature is enabled
 *
 * @param {string} featureSlug - The feature slug to check (e.g., 'reviews', 'emails')
 * @returns {boolean} True if feature is enabled, false otherwise
 *
 * @example
 * const hasReviews = useFeature('reviews');
 * if (!hasReviews) {
 *   return <UpgradePrompt />;
 * }
 */
export const useFeature = (featureSlug) => {
	return useSelector(selectHasFeature(featureSlug));
};

/**
 * React hook to get all enabled features
 *
 * @returns {string[]} Array of enabled feature slugs
 *
 * @example
 * const features = useFeatures();
 * console.log('Enabled features:', features);
 */
export const useFeatures = () => {
	return useSelector((state) => state.features.enabled);
};

/**
 * React hook to check if running in SaaS mode
 *
 * @returns {boolean} True if in SaaS mode
 *
 * @example
 * const isSaas = useIsSaas();
 * if (isSaas) {
 *   // Show SaaS-specific UI
 * }
 */
export const useIsSaas = () => {
	return window.simplyconf?.isSaas === "true";
};
