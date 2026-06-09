import axios from "@utils/axios";

/**
 * Author Service
 * Handles API calls for author CRUD operations
 * Supports hybrid author model - WordPress users and external collaborators
 */
class AuthorService {
	/**
	 * Get all authors with optional filtering
	 * @param {Object} params - Query parameters
	 * @param {number} params.event_id - Filter by event
	 * @param {string} params.search - Search by name or email
	 * @param {boolean} params.has_user - Filter by WordPress user linkage
	 * @param {number} params.limit - Results per page (default: 50)
	 * @param {number} params.offset - Pagination offset (default: 0)
	 * @returns {Promise<Array>} Array of authors
	 */
	async getAll(params = {}) {
		const response = await axios.get("/authors", { params });
		return response.data;
	}

	/**
	 * Get single author by ID with custom fields and abstracts
	 * @param {number} authorId - Author ID
	 * @returns {Promise<Object>} Author object with custom_fields and abstracts
	 */
	async getById(authorId) {
		const response = await axios.get(`/authors/${authorId}`);
		return response.data;
	}

	/**
	 * Create new author
	 * @param {Object} data - Author data
	 * @param {string} data.first_name - First name (required)
	 * @param {string} data.last_name - Last name (required)
	 * @param {string} data.email - Email address (required, unique)
	 * @param {Object} data.custom_fields - Custom field values {field_id: value}
	 * @returns {Promise<Object>} Created author object
	 */
	async create(data) {
		const response = await axios.post("/authors", data);
		return response.data;
	}

	/**
	 * Update author
	 * @param {number} authorId - Author ID
	 * @param {Object} data - Updated author data
	 * @param {string} data.first_name - First name
	 * @param {string} data.last_name - Last name
	 * @param {string} data.email - Email address (must be unique)
	 * @param {Object} data.custom_fields - Custom field values {field_id: value}
	 * @returns {Promise<Object>} Updated author object
	 */
	async update(authorId, data) {
		const response = await axios.put(`/authors/${authorId}`, data);
		return response.data;
	}

	/**
	 * Delete author
	 * Only allowed if author is not linked to any abstracts
	 * @param {number} authorId - Author ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async delete(authorId) {
		const response = await axios.delete(`/authors/${authorId}`);
		return response.data;
	}

	/**
	 * Get author's abstracts
	 * @param {number} authorId - Author ID
	 * @returns {Promise<Array>} Array of abstracts with author metadata
	 */
	async getAuthorAbstracts(authorId) {
		const response = await axios.get(`/authors/${authorId}/abstracts`);
		return response.data;
	}

	/**
	 * Link author to WordPress user by email
	 * Attempts to find WP user with matching email and link them
	 * @param {number} authorId - Author ID
	 * @returns {Promise<Object>} Link result with user info
	 */
	async linkToUser(authorId) {
		const response = await axios.post(`/authors/${authorId}/link-user`);
		return response.data;
	}

	/**
	 * Search authors by email (for duplicate checking)
	 * @param {string} email - Email to search for
	 * @returns {Promise<Array>} Array of matching authors
	 */
	async searchByEmail(email) {
		const response = await axios.get("/authors/search", {
			params: { email },
		});
		return response.data;
	}

	/**
	 * Get authors for a specific event
	 * @param {number} eventId - Event ID
	 * @param {Object} options - Additional query options
	 * @returns {Promise<Array>} Array of authors for the event
	 */
	async getByEvent(eventId, options = {}) {
		return this.getAll({ event_id: eventId, ...options });
	}

	/**
	 * Search authors with pagination
	 * @param {string} searchTerm - Search term for name or email
	 * @param {number} page - Page number (1-based)
	 * @param {number} pageSize - Results per page
	 * @returns {Promise<Array>} Array of matching authors
	 */
	async search(searchTerm, page = 1, pageSize = 50) {
		const offset = (page - 1) * pageSize;
		return this.getAll({
			search: searchTerm,
			limit: pageSize,
			offset,
		});
	}

	/**
	 * Get authors linked to WordPress users
	 * @param {Object} options - Additional query options
	 * @returns {Promise<Array>} Array of authors with WordPress accounts
	 */
	async getLinkedAuthors(options = {}) {
		return this.getAll({ has_user: true, ...options });
	}

	/**
	 * Get external authors (not linked to WordPress users)
	 * @param {Object} options - Additional query options
	 * @returns {Promise<Array>} Array of external collaborators
	 */
	async getExternalAuthors(options = {}) {
		return this.getAll({ has_user: false, ...options });
	}

	/**
	 * Check if email is already in use
	 * @param {string} email - Email to check
	 * @param {number} excludeAuthorId - Author ID to exclude (for updates)
	 * @returns {Promise<boolean>} True if email exists
	 */
	async emailExists(email, excludeAuthorId = null) {
		const authors = await this.searchByEmail(email);
		if (excludeAuthorId) {
			return authors.some((a) => a.author_id !== excludeAuthorId);
		}
		return authors.length > 0;
	}

	/**
	 * Format author name
	 * @param {Object} author - Author object
	 * @param {string} format - Format: 'full', 'last-first', 'initials'
	 * @returns {string} Formatted name
	 */
	formatName(author, format = "full") {
		if (!author) return "";

		switch (format) {
			case "last-first":
				return `${author.last_name}, ${author.first_name}`;
			case "initials":
				return `${author.first_name[0]}. ${author.last_name}`;
			default:
				return `${author.first_name} ${author.last_name}`;
		}
	}

	/**
	 * Get author's affiliation (from custom fields)
	 * @param {Object} author - Author object with custom_fields
	 * @returns {string|null} Affiliation value
	 */
	getAffiliation(author) {
		if (!author?.custom_fields) return null;
		const affiliationField = author.custom_fields.find(
			(f) => f.name === "affiliation",
		);
		return affiliationField?.value || null;
	}

	/**
	 * Get author's ORCID (from custom fields)
	 * @param {Object} author - Author object with custom_fields
	 * @returns {string|null} ORCID value
	 */
	getORCID(author) {
		if (!author?.custom_fields) return null;
		const orcidField = author.custom_fields.find((f) => f.name === "orcid");
		return orcidField?.value || null;
	}

	/**
	 * Format ORCID as URL
	 * @param {string} orcid - ORCID identifier
	 * @returns {string} ORCID URL
	 */
	formatORCIDUrl(orcid) {
		if (!orcid) return "";
		// Remove existing URL if present
		const cleanOrcid = orcid.replace("https://orcid.org/", "");
		return `https://orcid.org/${cleanOrcid}`;
	}
}

export default new AuthorService();
