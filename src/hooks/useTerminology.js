import { selectTerminology } from "@state/settingSlice";
import { useCallback } from "react";
import { useSelector } from "react-redux";

// Import WordPress i18n - will be provided by webpack externals in production
// In development, these will be undefined and we'll use fallbacks
let _n;
let _x;
try {
	({ _n, _x } = require("@wordpress/i18n"));
} catch (_e) {
	// In development, require might fail, use fallbacks
}

// Fallback implementations for when WordPress i18n is not available
const fallback_n = (singular, plural, count, _domain) => {
	return count === 1 ? singular : plural;
};

const fallback_x = (text, _context, _domain) => {
	return text;
};

// Use WordPress functions if available, otherwise fallbacks
const n = typeof _n === "function" ? _n : fallback_n;
const x = typeof _x === "function" ? _x : fallback_x;

/**
 * Custom hook for handling terminology and translations
 * Provides access to custom terminology overrides with fallbacks to WordPress translations
 */
export const useTerminology = () => {
	const terminology = useSelector(selectTerminology);

	/**
	 * Get term with proper translation and customization
	 * @param {string} entity - Entity type (abstract, author, reviewer, etc.)
	 * @param {number} count - Quantity for plural forms (default: 1)
	 * @param {string} form - Form type: 'default', 'lowercase', 'uppercase' (default: 'default')
	 * @returns {string} Translated and customized term
	 */
	/**
	 * Get term with proper translation and customization
	 * @param {string} entity - Entity type (abstract, author, reviewer, etc.)
	 * @param {number} count - Quantity for plural forms (default: 1)
	 * @param {string} form - Form type: 'default', 'lowercase', 'uppercase' (default: 'default')
	 * @returns {string} Translated and customized term
	 */
	const getTerm = useCallback(
		(entity, count = 1, form = "default") => {
			const isPlural = count !== 1;
			const customTerm = terminology[entity];

			// Get custom term or fall back to default translation
			let term;
			if (customTerm) {
				term = isPlural ? customTerm.plural : customTerm.singular;
			} else {
				// Default translations with proper pluralization
				term = n(
					getDefaultTerm(entity, false),
					getDefaultTerm(entity, true),
					count,
					"simplyconf",
				);
			}

			// Apply formatting
			switch (form) {
				case "lowercase":
					return term.toLowerCase();
				case "uppercase":
					return term.toUpperCase();
				default:
					return term;
			}
		},
		[terminology],
	);

	/**
	 * Get term with context for translation disambiguation
	 * @param {string} entity - Entity type
	 * @param {string} context - Context string for translation
	 * @param {number} count - Quantity for plural forms (default: 1)
	 * @returns {string} Translated term with context
	 */
	const getTermWithContext = (entity, context, count = 1) => {
		const customTerm = terminology[entity];
		if (customTerm) {
			return count === 1 ? customTerm.singular : customTerm.plural;
		}
		return x(getDefaultTerm(entity, count !== 1), context, "simplyconf");
	};

	/**
	 * Check if custom terminology is available for an entity
	 * @param {string} entity - Entity type
	 * @returns {boolean} Whether custom terminology exists
	 */
	const hasCustomTerm = (entity) => {
		return terminology[entity] !== undefined;
	};

	/**
	 * Get all available terminology entities
	 * @returns {string[]} Array of entity names
	 */
	const getAvailableEntities = () => {
		return Object.keys(terminology);
	};

	return {
		getTerm,
		getTermWithContext,
		hasCustomTerm,
		getAvailableEntities,
		terminology,
	};
};

/**
 * Default term mappings - fallback when no custom terminology is set
 * @param {string} entity - Entity type
 * @param {boolean} plural - Whether to return plural form
 * @returns {string} Default term
 */
function getDefaultTerm(entity, plural = false) {
	const defaults = {
		abstract: ["Abstract", "Abstracts"],
		author: ["Author", "Authors"],
		reviewer: ["Reviewer", "Reviewers"],
		review: ["Review", "Reviews"],
		session: ["Session", "Sessions"],
		track: ["Track", "Tracks"],
		submission: ["Submission", "Submissions"],
		registration: ["Registration", "Registrations"],
		attendee: ["Attendee", "Attendees"],
		user: ["User", "Users"],
	};
	return defaults[entity]?.[plural ? 1 : 0] || entity;
}
