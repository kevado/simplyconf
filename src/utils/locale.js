/**
 * Locale utilities for SimplyConf
 * Handles locale detection, RTL support, and locale-related functions
 */

/**
 * Get current locale from WordPress
 * @returns {string} Full locale code (e.g., 'en_US', 'fr_FR')
 */
export const getCurrentLocale = () => {
	return window.simplyconf?.locale || "en_US";
};

/**
 * Get language code only (first part before underscore)
 * @returns {string} Language code (e.g., 'en', 'fr')
 */
export const getLanguageCode = () => {
	const locale = getCurrentLocale();
	return locale.split("_")[0] || "en";
};

/**
 * Get country/region code only (second part after underscore)
 * @returns {string} Country code (e.g., 'US', 'FR')
 */
export const getCountryCode = () => {
	const locale = getCurrentLocale();
	const parts = locale.split("_");
	return parts[1] || parts[0].toUpperCase();
};

/**
 * Check if current locale is RTL (Right-to-Left)
 * @returns {boolean} Whether the current locale is RTL
 */
export const isRTL = () => {
	const languageCode = getLanguageCode();
	const rtlLanguages = [
		"ar", // Arabic
		"he", // Hebrew
		"fa", // Persian/Farsi
		"ur", // Urdu
		"yi", // Yiddish
		"ug", // Uyghur
		"ku", // Kurdish (some dialects)
	];

	return rtlLanguages.includes(languageCode);
};

/**
 * Check if current locale is LTR (Left-to-Right)
 * @returns {boolean} Whether the current locale is LTR
 */
export const isLTR = () => {
	return !isRTL();
};

/**
 * Get text direction for current locale
 * @returns {string} 'rtl' or 'ltr'
 */
export const getTextDirection = () => {
	return isRTL() ? "rtl" : "ltr";
};

/**
 * Get Ant Design locale object for current locale
 * @returns {object} Ant Design locale configuration
 */
export const getAntdLocale = () => {
	const languageCode = getLanguageCode();

	// Import Ant Design locales dynamically
	const localeMap = {
		ar: () => import("antd/locale/ar_EG"),
		he: () => import("antd/locale/he_IL"),
		fa: () => import("antd/locale/fa_IR"),
		fr: () => import("antd/locale/fr_FR"),
		es: () => import("antd/locale/es_ES"),
		de: () => import("antd/locale/de_DE"),
		it: () => import("antd/locale/it_IT"),
		ja: () => import("antd/locale/ja_JP"),
		ko: () => import("antd/locale/ko_KR"),
		ru: () => import("antd/locale/ru_RU"),
		zh: () => import("antd/locale/zh_CN"),
		pt: () => import("antd/locale/pt_BR"),
		tr: () => import("antd/locale/tr_TR"),
		nl: () => import("antd/locale/nl_NL"),
		sv: () => import("antd/locale/sv_SE"),
		da: () => import("antd/locale/da_DK"),
		no: () => import("antd/locale/nb_NO"),
		fi: () => import("antd/locale/fi_FI"),
		pl: () => import("antd/locale/pl_PL"),
		cs: () => import("antd/locale/cs_CZ"),
		sk: () => import("antd/locale/sk_SK"),
		hu: () => import("antd/locale/hu_HU"),
		hr: () => import("antd/locale/hr_HR"),
		sl: () => import("antd/locale/sl_SI"),
		et: () => import("antd/locale/et_EE"),
		lv: () => import("antd/locale/lv_LV"),
		lt: () => import("antd/locale/lt_LT"),
	};

	const importFn = localeMap[languageCode];
	if (importFn) {
		return importFn().then((module) => module.default);
	}

	// Default fallback to English
	return import("antd/locale/en_US").then((module) => module.default);
};

/**
 * Get Day.js locale for current locale
 * @returns {string} Day.js locale code
 */
export const getDayJsLocale = () => {
	const languageCode = getLanguageCode();
	const _countryCode = getCountryCode();

	// Map WordPress locales to Day.js locales
	const localeMap = {
		ar: "ar",
		he: "he",
		fa: "fa",
		fr: "fr",
		es: "es",
		de: "de",
		it: "it",
		ja: "ja",
		ko: "ko",
		ru: "ru",
		zh: "zh-cn",
		pt: "pt-br",
		tr: "tr",
		nl: "nl",
		sv: "sv",
		da: "da",
		no: "nb",
		fi: "fi",
		pl: "pl",
		cs: "cs",
		sk: "sk",
		hu: "hu",
		hr: "hr",
		sl: "sl",
		et: "et",
		lv: "lv",
		lt: "lt",
	};

	return localeMap[languageCode] || "en";
};

/**
 * Check if locale supports a specific feature
 * @param {string} feature - Feature to check ('rtl', 'cjk', 'latin', etc.)
 * @returns {boolean} Whether the current locale supports the feature
 */
export const localeSupports = (feature) => {
	const languageCode = getLanguageCode();

	switch (feature) {
		case "rtl":
			return isRTL();

		case "cjk":
			return ["zh", "ja", "ko"].includes(languageCode);

		case "latin":
			// Most European languages use Latin script
			return !["ar", "he", "fa", "zh", "ja", "ko", "ru", "hi", "th"].includes(
				languageCode,
			);

		case "emoji":
			// All modern browsers support emoji, but some systems might not
			return true;

		default:
			return false;
	}
};

/**
 * Get locale-specific formatting options
 * @returns {object} Locale formatting preferences
 */
export const getLocaleFormatting = () => {
	const _languageCode = getLanguageCode();
	const locale = getCurrentLocale();

	return {
		// Date format preferences
		dateFormat: getDateFormatPreference(locale),

		// Time format preferences
		timeFormat: getTimeFormatPreference(locale),

		// Number formatting preferences
		numberFormat: {
			groupSeparator: getGroupSeparator(locale),
			decimalSeparator: getDecimalSeparator(locale),
		},

		// Currency preferences
		currency: getCurrencyPreference(locale),

		// Text direction
		direction: getTextDirection(),

		// Week start day (0 = Sunday, 1 = Monday)
		weekStartDay: getWeekStartDay(locale),
	};
};

/**
 * Get preferred date format for locale
 * @param {string} locale - Locale code
 * @returns {string} Date format pattern
 */
function getDateFormatPreference(locale) {
	const formats = {
		en_US: "MM/DD/YYYY",
		en_GB: "DD/MM/YYYY",
		en_AU: "DD/MM/YYYY",
		en_CA: "DD/MM/YYYY",
		fr_FR: "DD/MM/YYYY",
		de_DE: "DD.MM.YYYY",
		es_ES: "DD/MM/YYYY",
		it_IT: "DD/MM/YYYY",
		pt_BR: "DD/MM/YYYY",
		ja_JP: "YYYY/MM/DD",
		ko_KR: "YYYY.MM.DD",
		zh_CN: "YYYY/MM/DD",
	};

	return formats[locale] || "DD/MM/YYYY";
}

/**
 * Get preferred time format for locale
 * @param {string} locale - Locale code
 * @returns {string} Time format pattern
 */
function getTimeFormatPreference(locale) {
	const formats = {
		en_US: "h:mm A",
		en_GB: "HH:mm",
		fr_FR: "HH:mm",
		de_DE: "HH:mm",
		es_ES: "HH:mm",
		it_IT: "HH:mm",
		pt_BR: "HH:mm",
		ja_JP: "HH:mm",
		ko_KR: "HH:mm",
		zh_CN: "HH:mm",
	};

	return formats[locale] || "HH:mm";
}

/**
 * Get group separator for numbers
 * @param {string} locale - Locale code
 * @returns {string} Group separator
 */
function getGroupSeparator(locale) {
	const separators = {
		en_US: ",",
		en_GB: ",",
		de_DE: ".",
		fr_FR: " ",
		es_ES: ".",
		it_IT: ".",
		pt_BR: ".",
		ja_JP: ",",
		ko_KR: ",",
		zh_CN: ",",
	};

	return separators[locale] || ",";
}

/**
 * Get decimal separator for numbers
 * @param {string} locale - Locale code
 * @returns {string} Decimal separator
 */
function getDecimalSeparator(locale) {
	const separators = {
		en_US: ".",
		en_GB: ".",
		de_DE: ",",
		fr_FR: ",",
		es_ES: ",",
		it_IT: ",",
		pt_BR: ",",
		ja_JP: ".",
		ko_KR: ".",
		zh_CN: ".",
	};

	return separators[locale] || ".";
}

/**
 * Get currency preference for locale
 * @param {string} locale - Locale code
 * @returns {object} Currency preferences
 */
function getCurrencyPreference(locale) {
	const currencies = {
		en_US: { code: "USD", symbol: "$" },
		en_GB: { code: "GBP", symbol: "£" },
		en_AU: { code: "AUD", symbol: "A$" },
		en_CA: { code: "CAD", symbol: "C$" },
		fr_FR: { code: "EUR", symbol: "€" },
		de_DE: { code: "EUR", symbol: "€" },
		es_ES: { code: "EUR", symbol: "€" },
		it_IT: { code: "EUR", symbol: "€" },
		pt_BR: { code: "BRL", symbol: "R$" },
		ja_JP: { code: "JPY", symbol: "¥" },
		ko_KR: { code: "KRW", symbol: "₩" },
		zh_CN: { code: "CNY", symbol: "¥" },
	};

	return currencies[locale] || { code: "USD", symbol: "$" };
}

/**
 * Get week start day for locale
 * @param {string} locale - Locale code
 * @returns {number} Week start day (0 = Sunday, 1 = Monday)
 */
function getWeekStartDay(locale) {
	// Most countries use Monday as start of week, US uses Sunday
	const sundayStartLocales = ["en_US", "en_CA", "en_AU", "es_MX", "pt_BR"];

	return sundayStartLocales.some((loc) => locale.startsWith(loc.split("_")[0]))
		? 0
		: 1;
}

/**
 * Check if locale is available/supported
 * @param {string} locale - Locale to check
 * @returns {boolean} Whether the locale is supported
 */
export const isLocaleSupported = (locale) => {
	// Basic check - we support the major locales we've configured
	const supportedLanguages = [
		"ar",
		"he",
		"fa",
		"fr",
		"es",
		"de",
		"it",
		"ja",
		"ko",
		"ru",
		"zh",
		"pt",
		"tr",
		"nl",
		"sv",
		"da",
		"no",
		"fi",
		"pl",
		"cs",
		"sk",
		"hu",
		"hr",
		"sl",
		"et",
		"lv",
		"lt",
		"en",
	];

	const languageCode = locale.split("_")[0];
	return supportedLanguages.includes(languageCode);
};
