/**
 * SimplyConf Core API
 * Version: 1.0.0
 *
 * This is the public API surface for addons.
 * Breaking changes require major version bump.
 *
 * @package SimplyConf
 * @since 1.0.0
 */

export const CORE_API_VERSION = "1.0.0";

/**
 * Compare semantic versions
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
const compareVersions = (version1, version2) => {
	const v1Parts = version1.split(".").map(Number);
	const v2Parts = version2.split(".").map(Number);

	for (let i = 0; i < 3; i++) {
		const v1 = v1Parts[i] || 0;
		const v2 = v2Parts[i] || 0;
		if (v1 > v2) return 1;
		if (v1 < v2) return -1;
	}
	return 0;
};

/**
 * Check if a required version is compatible with current version
 * @param {string} requiredVersion - Minimum required version
 * @param {string} currentVersion - Current API version
 * @returns {boolean} True if compatible
 */
const isCompatible = (requiredVersion, currentVersion = CORE_API_VERSION) => {
	const reqParts = requiredVersion.split(".").map(Number);
	const curParts = currentVersion.split(".").map(Number);

	// Major version must match
	if (reqParts[0] !== curParts[0]) {
		return false;
	}

	// Current version must be >= required version
	return compareVersions(currentVersion, requiredVersion) >= 0;
};

/**
 * Core API Object
 * Provides structured interface for addon integration
 */
export const CoreAPI = {
	version: CORE_API_VERSION,

	/**
	 * Check if a required version is compatible
	 * @param {string} requiredVersion - Minimum required version (e.g., '3.0.0')
	 * @returns {boolean} True if compatible
	 */
	isCompatible: (requiredVersion) =>
		isCompatible(requiredVersion, CORE_API_VERSION),

	/**
	 * Get the Redux store instance
	 * @returns {object} Redux store
	 */
	getStore: () => {
		if (typeof window !== "undefined" && window.simplyconf?.store) {
			return window.simplyconf.store;
		}
		console.error("SimplyConf: Store not initialized");
		return null;
	},

	/**
	 * Register a reducer for an addon
	 * @param {string} name - Addon name (e.g., 'reviews', 'emails')
	 * @param {function} reducer - Redux reducer function
	 * @returns {boolean} True if registered successfully
	 */
	registerReducer: (name, reducer) => {
		if (typeof window === "undefined") {
			console.error(
				"SimplyConf: Cannot register reducer - window not available",
			);
			return false;
		}

		if (!window.simplyconf) {
			window.simplyconf = {};
		}

		const reducerKey = `${name}Reducer`;
		window.simplyconf[reducerKey] = reducer;
		console.log(`✓ SimplyConf API: Reducer '${name}' registered`);
		return true;
	},

	/**
	 * Register components for an addon
	 * @param {string} namespace - Addon namespace (e.g., 'reviews', 'emails')
	 * @param {object} components - Object containing component definitions
	 * @returns {boolean} True if registered successfully
	 */
	registerComponents: (namespace, components) => {
		if (typeof window === "undefined") {
			console.error(
				"SimplyConf: Cannot register components - window not available",
			);
			return false;
		}

		if (!window.simplyconf) {
			window.simplyconf = {};
		}

		if (!window.simplyconf.components) {
			window.simplyconf.components = {};
		}

		window.simplyconf.components[namespace] = components;
		console.log(
			`✓ SimplyConf API: Components registered for '${namespace}' (${
				Object.keys(components).length
			} components)`,
		);
		return true;
	},

	/**
	 * Register a service for an addon
	 * @param {string} name - Service name (e.g., 'payments.stripe', 'emails.sender')
	 * @param {object} service - Service object or class
	 * @returns {boolean} True if registered successfully
	 */
	registerService: (name, service) => {
		if (typeof window === "undefined") {
			console.error(
				"SimplyConf: Cannot register service - window not available",
			);
			return false;
		}

		if (!window.simplyconf) {
			window.simplyconf = {};
		}

		if (!window.simplyconf.services) {
			window.simplyconf.services = {};
		}

		window.simplyconf.services[name] = service;
		console.log(`✓ SimplyConf API: Service '${name}' registered`);
		return true;
	},

	/**
	 * Get a registered service
	 * @param {string} name - Service name
	 * @returns {object|null} Service object or null if not found
	 */
	getService: (name) => {
		if (typeof window !== "undefined" && window.simplyconf?.services?.[name]) {
			return window.simplyconf.services[name];
		}
		console.warn(`SimplyConf: Service '${name}' not found`);
		return null;
	},

	/**
	 * Register an addon with the core
	 * @param {object} config - Addon configuration
	 * @param {string} config.name - Addon name
	 * @param {string} config.version - Addon version
	 * @param {string} config.requiredCoreVersion - Minimum required core version
	 * @param {object} config.components - Components to register
	 * @param {function} config.reducer - Redux reducer
	 * @param {object} config.services - Services to register
	 * @returns {boolean} True if registered successfully
	 */
	registerAddon: (config) => {
		const {
			name,
			version,
			requiredCoreVersion,
			components,
			reducer,
			reducers,
			services,
			actions,
		} = config;

		// Validate required fields
		if (!name || !version) {
			console.error("SimplyConf: Addon registration requires name and version");
			return false;
		}

		// Check version compatibility
		if (
			requiredCoreVersion &&
			!isCompatible(requiredCoreVersion, CORE_API_VERSION)
		) {
			console.error(
				`SimplyConf: Addon '${name}' requires core version ${requiredCoreVersion}, but current version is ${CORE_API_VERSION}`,
			);
			return false;
		}

		console.log(
			`🔷 SimplyConf API: Registering addon '${name}' v${version}...`,
		);

		// Register components
		if (components) {
			CoreAPI.registerComponents(name, components);
		}

		// Register reducer (legacy single reducer support)
		if (reducer) {
			CoreAPI.registerReducer(name, reducer);
		}

		// Register reducers (new multiple reducers support)
		if (reducers) {
			Object.entries(reducers).forEach(([reducerName, reducerFunc]) => {
				CoreAPI.registerReducer(reducerName, reducerFunc);
			});
		}

		// Register services
		if (services) {
			Object.entries(services).forEach(([serviceName, service]) => {
				CoreAPI.registerService(`${name}.${serviceName}`, service);
			});
		}

		// Update addon registry (merge with PHP-registered data if it exists)
		if (!window.simplyconf.addons) {
			window.simplyconf.addons = {};
		}

		// Preserve PHP-registered metadata (slug, path, etc.) and merge with JS registration
		const existingAddon = window.simplyconf.addons[name] || {};
		window.simplyconf.addons[name] = {
			...existingAddon,
			name: existingAddon.name || name,
			slug: existingAddon.slug || name,
			version,
			active: true,
			actions: actions || {},
		};

		console.log(
			`✅ SimplyConf API: Addon '${name}' v${version} registered successfully`,
		);
		return true;
	},

	/**
	 * Get core utilities
	 * @returns {object} Utility functions
	 */
	getUtils: () => {
		if (typeof window !== "undefined" && window.simplyconf?.utils) {
			return window.simplyconf.utils;
		}
		return {};
	},

	/**
	 * Get core hooks
	 * @returns {object} React hooks
	 */
	getHooks: () => {
		if (typeof window !== "undefined" && window.simplyconf?.hooks) {
			return window.simplyconf.hooks;
		}
		return {};
	},

	/**
	 * Get core state selectors and actions
	 * @returns {object} State management utilities
	 */
	getState: () => {
		if (typeof window !== "undefined" && window.simplyconf?.state) {
			return window.simplyconf.state;
		}
		return {};
	},
};

// Expose API on window for addon access
if (typeof window !== "undefined") {
	if (!window.simplyconf) {
		window.simplyconf = {};
	}
	window.simplyconf.api = CoreAPI;
	window.simplyconf.apiVersion = CORE_API_VERSION;
	console.log(`✓ SimplyConf Core API v${CORE_API_VERSION} initialized`);
}

export default CoreAPI;
