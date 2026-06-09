import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import "dayjs/locale/fr";
import "dayjs/locale/es";
import "dayjs/locale/de";

// Extend dayjs with plugins
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

/**
 * Get current locale from WordPress settings or fallback to 'en'
 * @returns {string} Locale code (e.g., 'en', 'fr', 'es')
 */
export const getLocale = () => {
	return window.simplyconf?.locale?.split("_")[0] || "en";
};

/**
 * Get full locale from WordPress settings
 * @returns {string} Full locale code (e.g., 'en_US', 'fr_FR')
 */
export const getFullLocale = () => {
	return window.simplyconf?.locale || "en_US";
};

/**
 * Format date according to locale
 * @param {string|Date|dayjs.Dayjs} date - Date to format
 * @param {string} format - Day.js format string (default: 'LL')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = "LL") => {
	return dayjs(date).locale(getLocale()).format(format);
};

/**
 * Format date and time according to locale
 * @param {string|Date|dayjs.Dayjs} date - Date to format
 * @param {string} format - Day.js format string (default: 'LLL')
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, format = "LLL") => {
	return dayjs(date).locale(getLocale()).format(format);
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date|dayjs.Dayjs} date - Date to compare
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
	return dayjs(date).locale(getLocale()).fromNow();
};

/**
 * Format time only according to locale
 * @param {string|Date|dayjs.Dayjs} date - Date to format
 * @param {string} format - Time format (default: 'LT')
 * @returns {string} Formatted time string
 */
export const formatTime = (date, format = "LT") => {
	return dayjs(date).locale(getLocale()).format(format);
};

/**
 * Format number according to locale
 * @param {number} number - Number to format
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, decimals = 0) => {
	return new Intl.NumberFormat(getFullLocale(), {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(number);
};

/**
 * Format currency according to locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD") => {
	return new Intl.NumberFormat(getFullLocale(), {
		style: "currency",
		currency: currency,
	}).format(amount);
};

/**
 * Format percentage according to locale
 * @param {number} value - Value to format as percentage (0.25 = 25%)
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 0) => {
	return new Intl.NumberFormat(getFullLocale(), {
		style: "percent",
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value);
};

/**
 * Parse date string using locale-aware parsing
 * @param {string} dateString - Date string to parse
 * @param {string} format - Expected format
 * @returns {dayjs.Dayjs} Parsed dayjs object
 */
export const parseDate = (dateString, format) => {
	return dayjs(dateString, format, getLocale());
};

/**
 * Check if a date is today
 * @param {string|Date|dayjs.Dayjs} date - Date to check
 * @returns {boolean} Whether the date is today
 */
export const isToday = (date) => {
	return dayjs(date).isSame(dayjs(), "day");
};

/**
 * Check if a date is yesterday
 * @param {string|Date|dayjs.Dayjs} date - Date to check
 * @returns {boolean} Whether the date is yesterday
 */
export const isYesterday = (date) => {
	return dayjs(date).isSame(dayjs().subtract(1, "day"), "day");
};

/**
 * Check if a date is tomorrow
 * @param {string|Date|dayjs.Dayjs} date - Date to check
 * @returns {boolean} Whether the date is tomorrow
 */
export const isTomorrow = (date) => {
	return dayjs(date).isSame(dayjs().add(1, "day"), "day");
};

/**
 * Get localized day name
 * @param {string|Date|dayjs.Dayjs} date - Date to get day name for
 * @param {string} format - 'long', 'short', or 'narrow' (default: 'long')
 * @returns {string} Localized day name
 */
export const getDayName = (date, format = "long") => {
	const dateObj = dayjs(date);
	const _dayIndex = dateObj.day();

	const formatter = new Intl.DateTimeFormat(getFullLocale(), {
		weekday: format,
	});

	return formatter.format(dateObj.toDate());
};

/**
 * Get localized month name
 * @param {number} monthIndex - Month index (0-11)
 * @param {string} format - 'long', 'short', or 'narrow' (default: 'long')
 * @returns {string} Localized month name
 */
export const getMonthName = (monthIndex, format = "long") => {
	const date = new Date(2000, monthIndex, 1); // Use a reference date
	const formatter = new Intl.DateTimeFormat(getFullLocale(), {
		month: format,
	});

	return formatter.format(date);
};

/**
 * Get localized date format pattern for the current locale
 * @returns {string} Date format pattern (e.g., 'MM/DD/YYYY', 'DD/MM/YYYY')
 */
export const getDateFormat = () => {
	// Use WordPress date format if available, otherwise derive from locale
	if (window.simplyconf?.dateFormat) {
		return window.simplyconf.dateFormat;
	}

	// Fallback: derive from locale
	const locale = getFullLocale().toLowerCase();
	if (locale.includes("us") || locale.includes("ca")) {
		return "MM/DD/YYYY";
	}
	if (locale.includes("gb") || locale.includes("au")) {
		return "DD/MM/YYYY";
	}
	return "DD/MM/YYYY"; // European default
};

/**
 * Get localized time format pattern for the current locale
 * @returns {string} Time format pattern
 */
export const getTimeFormat = () => {
	if (window.simplyconf?.timeFormat) {
		return window.simplyconf.timeFormat;
	}

	// Fallback based on locale
	const locale = getFullLocale().toLowerCase();
	if (locale.includes("us")) {
		return "h:mm A"; // 12-hour format
	}
	return "HH:mm"; // 24-hour format
};
