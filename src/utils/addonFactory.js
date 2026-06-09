import UpgradePrompt from "@components/shared/UpgradePrompt";
import React from "react";

/**
 * Creates a lazy wrapper component that reads an add-on component from
 * window.simplyconf.components at render time. Falls back to UpgradePrompt.
 *
 * @param {string} addon - The add-on key (e.g., 'reviews', 'emails')
 * @param {string} componentName - The component name within the add-on
 * @param {string} featureName - Human-readable feature name for UpgradePrompt
 * @param {React.ReactNode} [fallback] - Optional custom fallback element
 * @returns {React.FC} A wrapper component
 */
export function createAddonComponent(
	addon,
	componentName,
	featureName,
	fallback = null,
) {
	const AddonComponent = (props) => {
		const Component = window.simplyconf?.components?.[addon]?.[componentName];
		if (Component) return <Component {...props} />;
		if (fallback) return fallback;
		return <UpgradePrompt feature={featureName} />;
	};
	AddonComponent.displayName = `${addon}.${componentName}`;
	return AddonComponent;
}
