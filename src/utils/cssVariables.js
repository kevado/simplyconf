/**
 * CSS Variable Injection Utility
 * Injects theme settings as CSS custom properties for use in stylesheets
 */

/**
 * Inject theme settings as CSS variables into document root
 * @param {Object} settings - Appearance settings object
 */
export const injectThemeVariables = (settings) => {
	if (!settings) return;

	const root = document.documentElement;

	// Colors
	if (settings.colors) {
		if (settings.colors.primary) {
			root.style.setProperty(
				"--simplyconf-primary-color",
				settings.colors.primary,
			);
		}
		if (settings.colors.success) {
			root.style.setProperty(
				"--simplyconf-success-color",
				settings.colors.success,
			);
		}
		if (settings.colors.warning) {
			root.style.setProperty(
				"--simplyconf-warning-color",
				settings.colors.warning,
			);
		}
		if (settings.colors.error) {
			root.style.setProperty("--simplyconf-error-color", settings.colors.error);
		}
		if (settings.colors.info) {
			root.style.setProperty("--simplyconf-info-color", settings.colors.info);
		}
	}

	// Typography
	if (settings.typography) {
		if (settings.typography.fontFamily) {
			root.style.setProperty(
				"--simplyconf-font-family",
				settings.typography.fontFamily,
			);
		}
		if (settings.typography.baseFontSize) {
			root.style.setProperty(
				"--simplyconf-font-size",
				`${settings.typography.baseFontSize}px`,
			);
		}
		if (settings.typography.fontWeight) {
			root.style.setProperty(
				"--simplyconf-font-weight",
				settings.typography.fontWeight,
			);
		}
		if (settings.typography.lineHeight) {
			root.style.setProperty(
				"--simplyconf-line-height",
				settings.typography.lineHeight,
			);
		}
		if (settings.typography.letterSpacing !== undefined) {
			root.style.setProperty(
				"--simplyconf-letter-spacing",
				`${settings.typography.letterSpacing}px`,
			);
		}
	}

	// Layout
	if (settings.layout) {
		if (settings.layout.borderRadius !== undefined) {
			root.style.setProperty(
				"--simplyconf-border-radius",
				`${settings.layout.borderRadius}px`,
			);
		}
		if (settings.layout.customCSS) {
			injectCustomCSS(settings.layout.customCSS);
		}
	}
};

/**
 * Inject custom CSS into document head
 * @param {string} css - Custom CSS string
 */
export const injectCustomCSS = (css) => {
	if (!css || typeof css !== "string") return;

	// Remove existing custom CSS if present
	const existingStyle = document.getElementById("simplyconf-custom-css");
	if (existingStyle) {
		existingStyle.remove();
	}

	// Create and inject new style element
	const styleElement = document.createElement("style");
	styleElement.id = "simplyconf-custom-css";
	styleElement.textContent = css;
	document.head.appendChild(styleElement);
};

/**
 * Remove all injected theme variables and custom CSS
 */
export const removeThemeVariables = () => {
	const root = document.documentElement;

	// Remove CSS variables
	const variables = [
		"--simplyconf-primary-color",
		"--simplyconf-success-color",
		"--simplyconf-warning-color",
		"--simplyconf-error-color",
		"--simplyconf-info-color",
		"--simplyconf-font-family",
		"--simplyconf-font-size",
		"--simplyconf-font-weight",
		"--simplyconf-line-height",
		"--simplyconf-letter-spacing",
		"--simplyconf-border-radius",
	];

	variables.forEach((variable) => {
		root.style.removeProperty(variable);
	});

	// Remove custom CSS
	const customStyle = document.getElementById("simplyconf-custom-css");
	if (customStyle) {
		customStyle.remove();
	}
};
