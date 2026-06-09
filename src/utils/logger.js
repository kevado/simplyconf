/**
 * Structured logger utility
 *
 * Wraps console methods so that:
 *  - In production all log/debug/info output is suppressed by default
 *  - warn and error are always emitted (they surface real problems)
 *  - Every message is prefixed with "[SimplyConf]" for easy filtering
 *  - Debug mode can be enabled in production via:
 *      localStorage.setItem('simplyconf_debug', 'true')
 *    or by adding ?simplyconf_debug=true to the URL
 *
 * Usage:
 *   import logger from '@utils/logger';
 *   logger.log('Loaded event', eventId);
 *   logger.error('Fetch failed', error);
 */

// eslint-disable-next-line no-undef
const isDev =
	typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;

const isDebugEnabled = () => {
	try {
		if (localStorage.getItem("simplyconf_debug") === "true") return true;
		if (
			typeof URLSearchParams !== "undefined" &&
			new URLSearchParams(window.location.search).has("simplyconf_debug")
		)
			return true;
	} catch {
		// localStorage may be blocked
	}
	return false;
};

const canLog = () => isDev || isDebugEnabled();

// Indirect reference so TerserPlugin pure_funcs doesn't strip these calls
const _console = console;

const PREFIX = "[SimplyConf]";

const logger = {
	log(...args) {
		if (canLog()) _console.log(PREFIX, ...args);
	},
	debug(...args) {
		if (canLog()) _console.debug(PREFIX, ...args);
	},
	info(...args) {
		if (canLog()) _console.info(PREFIX, ...args);
	},
	warn(...args) {
		_console.warn(PREFIX, ...args);
	},
	error(...args) {
		_console.error(PREFIX, ...args);
	},
};

export default logger;
