import { theme } from "antd";

/**
 * Centralized theme configuration for SimplyConf frontend
 * Provides Ant Design ConfigProvider tokens for consistent styling
 */

export const getThemeTokens = (adminSettings = {}) => {
	return {
		token: {
			// Colors
			colorPrimary: adminSettings.colors?.primary || "#1890ff",
			colorSuccess: adminSettings.colors?.success || "#52c41a",
			colorWarning: adminSettings.colors?.warning || "#faad14",
			colorError: adminSettings.colors?.error || "#ff4d4f",

			// Typography
			fontFamily:
				adminSettings.typography?.fontFamily ||
				'Roboto, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
			fontSize: adminSettings.typography?.baseFontSize || 14,
			lineHeight: adminSettings.typography?.lineHeight || 1.5,
			fontSizeHeading1: adminSettings.typography?.baseFontSize
				? adminSettings.typography.baseFontSize * 2.285
				: 38, // 2.285x
			fontSizeHeading2: adminSettings.typography?.baseFontSize
				? adminSettings.typography.baseFontSize * 1.714
				: 30, // 1.714x
			fontSizeHeading3: adminSettings.typography?.baseFontSize
				? adminSettings.typography.baseFontSize * 1.285
				: 24, // 1.285x
			fontSizeHeading4: adminSettings.typography?.baseFontSize
				? adminSettings.typography.baseFontSize * 1.071
				: 20, // 1.071x
			fontSizeHeading5: adminSettings.typography?.baseFontSize
				? adminSettings.typography.baseFontSize * 0.928
				: 16, // 0.928x
			lineHeightHeading1: 1.2,
			lineHeightHeading2: 1.3,
			lineHeightHeading3: 1.4,
			lineHeightHeading4: 1.4,
			lineHeightHeading5: 1.5,
			fontWeightStrong: adminSettings.typography?.fontWeight || 600,
			fontWeight: adminSettings.typography?.fontWeight || 400,
			letterSpacing: adminSettings.typography?.letterSpacing || 0,

			// Spacing (4px base grid)
			marginXXS: 4,
			marginXS: 8,
			marginSM: 12,
			margin: 16,
			marginMD: 20,
			marginLG: 24,
			marginXL: 32,
			marginXXL: 48,
			paddingXXS: 4,
			paddingXS: 8,
			paddingSM: 12,
			padding: 16,
			paddingMD: 20,
			paddingLG: 24,
			paddingXL: 32,
			paddingXXL: 48,

			// Border radius
			borderRadius: adminSettings.layout?.borderRadius || 8,
			borderRadiusLG: adminSettings.layout?.borderRadius
				? adminSettings.layout.borderRadius * 1.5
				: 12,
			borderRadiusSM: adminSettings.layout?.borderRadius
				? adminSettings.layout.borderRadius * 0.5
				: 4,
			borderRadiusXS: adminSettings.layout?.borderRadius
				? adminSettings.layout.borderRadius * 0.25
				: 2,

			// Shadows (elevation levels)
			boxShadow:
				adminSettings.layout?.shadowIntensity === "none"
					? "none"
					: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)",
			boxShadowSecondary:
				adminSettings.layout?.shadowIntensity === "none"
					? "none"
					: adminSettings.layout?.shadowIntensity === "subtle"
						? "0 2px 8px -2px rgba(0, 0, 0, 0.1)"
						: adminSettings.layout?.shadowIntensity === "medium"
							? "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 1px 6px -2px rgba(0, 0, 0, 0.04)"
							: "0 12px 32px 0 rgba(0, 0, 0, 0.12), 0 2px 12px -4px rgba(0, 0, 0, 0.08)",

			// Control sizes
			controlHeight: 32,
			controlHeightSM: 24,
			controlHeightLG: 40,
			controlHeightXS: 16,

			// Other common tokens
			wireframe: false,
		},
		algorithm: theme.defaultAlgorithm,
	};
};

export default getThemeTokens;
