/**
 * Simple i18n utility for SimplyConf
 * This bypasses wp.i18n entirely to avoid loading issues
 */

// Translation data will be loaded here
let translations = {};
let locale = "en_US";

// Auto-load translations from WordPress localized data
if (typeof window.simplyconfI18n !== "undefined") {
	translations = window.simplyconfI18n.translations || {};
	locale = window.simplyconfI18n.locale || "en_US";
}

/**
 * Load translation data
 * @param {Object} data - Translation data object
 * @param {string} currentLocale - Current locale
 */
export function loadTranslations(data, currentLocale) {
	translations = data || {};
	locale = currentLocale || "en_US";
}

/**
 * Translate a string
 * @param {string} text - Text to translate
 * @param {string} _domain - Text domain (optional, for compatibility)
 * @returns {string} Translated text or original text
 */
export function __(text, _domain = "simplyconf") {
	// If we have a translation, return it
	if (translations[text]) {
		return Array.isArray(translations[text])
			? translations[text][0]
			: translations[text];
	}
	// Otherwise return original text
	return text;
}

/**
 * Translate with context
 * @param {string} text - Text to translate
 * @param {string} context - Context for translation
 * @param {string} _domain - Text domain
 * @returns {string} Translated text or original text
 */
export function _x(text, context, _domain = "simplyconf") {
	const key = `${context}\u0004${text}`;
	if (translations[key]) {
		return Array.isArray(translations[key])
			? translations[key][0]
			: translations[key];
	}
	return text;
}

/**
 * Resolve the plural form index per CLDR rules for the active locale.
 * @param {number} n - The count
 * @param {string} loc - BCP 47 / WordPress locale string
 * @returns {number} Index into the translated forms array
 */
function getPluralIndex(n, loc) {
	const lang = loc.split("_")[0].split("-")[0];
	switch (lang) {
		case "ru":
		case "uk": {
			const mod10 = n % 10;
			const mod100 = n % 100;
			if (mod10 === 1 && mod100 !== 11) return 0;
			if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 1;
			return 2;
		}
		case "pl": {
			if (n === 1) return 0;
			const mod10 = n % 10;
			const mod100 = n % 100;
			if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 1;
			return 2;
		}
		case "ja":
		case "zh":
		case "tr":
			return 0;
		default:
			return n !== 1 ? 1 : 0;
	}
}

/**
 * Translate plural
 * @param {string} single - Singular form
 * @param {string} plural - Plural form
 * @param {number} number - Number to determine singular/plural
 * @param {string} _domain - Text domain
 * @returns {string} Translated text
 */
export function _n(single, plural, number, _domain = "simplyconf") {
	const key = `${single}\u0000${plural}`;
	if (translations[key]) {
		const forms = translations[key];
		const idx = getPluralIndex(number, locale);
		return forms[Math.min(idx, forms.length - 1)];
	}
	return number === 1 ? single : plural;
}

/**
 * Get current locale
 * @returns {string} Current locale
 */
export function getLocale() {
	return locale;
}
