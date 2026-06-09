import axios from "@utils/axios";

class AttachmentService {
	/**
	 * Get attachments for an entity
	 * @param {string} entityType - Entity type (abstract|review|etc)
	 * @param {number} entityId - Entity ID
	 * @param {number} eventId - Event ID
	 * @returns {Promise<Array>} Array of attachment objects
	 */
	async getAttachments(entityType, entityId, eventId) {
		try {
			const resp = await axios.get("/attachments", {
				params: {
					entity_type: entityType,
					entity_id: entityId,
					event_id: eventId,
				},
			});
			return resp.data;
		} catch (error) {
			console.error("Error fetching attachments:", error);
			throw error;
		}
	}

	/**
	 * Get a single attachment by ID
	 * @param {number} attachmentId - Attachment ID
	 * @returns {Promise<Object>} Attachment object
	 */
	async getById(attachmentId) {
		try {
			const resp = await axios.get(`/attachments/${attachmentId}`);
			return resp.data;
		} catch (error) {
			console.error("Error fetching attachment:", error);
			throw error;
		}
	}

	/**
	 * Query attachments with flexible filtering
	 * @param {Object} params - Query parameters
	 * @returns {Promise<Array>} Array of attachment objects
	 */
	async queryAttachments(params = {}) {
		try {
			const resp = await axios.get("/attachments", { params });
			return resp.data;
		} catch (error) {
			console.error("Error querying attachments:", error);
			throw error;
		}
	}

	/**
	 * Upload file
	 * @param {File} file - File to upload
	 * @param {string} entityType - Entity type
	 * @param {number} entityId - Entity ID
	 * @param {number} eventId - Event ID
	 * @param {Object} options - Upload options (filePurpose, accessLevel, onProgress)
	 * @returns {Promise<Object>} Upload result
	 */
	async uploadFile(file, entityType, entityId, eventId, options = {}) {
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("entity_type", entityType);
			formData.append("entity_id", entityId);
			formData.append("event_id", eventId);

			if (options.filePurpose) {
				formData.append("file_purpose", options.filePurpose);
			}

			if (options.accessLevel) {
				formData.append("access_level", options.accessLevel);
			}

			const resp = await axios.post("/attachments/upload", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
				onUploadProgress: options.onProgress,
			});
			return resp.data;
		} catch (error) {
			console.error("Error uploading file:", error);
			throw error;
		}
	}

	/**
	 * Download file
	 * @param {number} attachmentId - Attachment ID
	 * @returns {Promise<AxiosResponse>} Raw axios response with blob data
	 */
	async downloadFile(attachmentId) {
		try {
			const resp = await axios.get(`/attachments/${attachmentId}/download`, {
				responseType: "blob",
			});
			return resp;
		} catch (error) {
			console.error("Error downloading file:", error);
			throw error;
		}
	}

	/**
	 * Delete attachment
	 * @param {number} attachmentId - Attachment ID
	 * @returns {Promise<Object>} Deletion result
	 */
	async deleteAttachment(attachmentId) {
		try {
			const resp = await axios.delete(`/attachments/${attachmentId}`);
			return resp.data;
		} catch (error) {
			console.error("Error deleting attachment:", error);
			throw error;
		}
	}

	/**
	 * Update attachment metadata
	 * @param {number} attachmentId - Attachment ID
	 * @param {Object} data - Updated metadata
	 * @returns {Promise<Object>} Updated attachment object
	 */
	async updateAttachment(attachmentId, data) {
		try {
			const resp = await axios.put(`/attachments/${attachmentId}`, data);
			return resp.data;
		} catch (error) {
			console.error("Error updating attachment:", error);
			throw error;
		}
	}

	/**
	 * Get file icon class based on MIME type
	 * @param {string} fileType - MIME type
	 * @returns {string} Icon name
	 */
	getFileIcon(fileType) {
		const icons = {
			"application/pdf": "file-pdf",
			"application/msword": "file-word",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				"file-word",
			"application/vnd.ms-excel": "file-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				"file-excel",
			"application/vnd.ms-powerpoint": "file-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation":
				"file-powerpoint",
			"image/jpeg": "file-image",
			"image/png": "file-image",
			"image/gif": "file-image",
			"video/mp4": "file-video",
			"video/avi": "file-video",
			"video/quicktime": "file-video",
		};

		return icons[fileType] || "file";
	}

	/**
	 * Format file size for display
	 * @param {number} bytes - File size in bytes
	 * @returns {string} Human-readable file size
	 */
	formatFileSize(bytes) {
		if (bytes === 0) return "0 Bytes";

		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	}

	/**
	 * Validate file MIME type against allowed types
	 * @param {File} file - File to validate
	 * @param {string[]} allowedTypes - Allowed MIME types
	 * @returns {boolean} Whether the file type is allowed
	 */
	validateFileType(file, allowedTypes = []) {
		const defaultAllowed = [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"image/jpeg",
			"image/png",
			"image/gif",
		];

		const allowed = allowedTypes.length > 0 ? allowedTypes : defaultAllowed;
		return allowed.includes(file.type);
	}

	/**
	 * Validate file size against a maximum
	 * @param {File} file - File to validate
	 * @param {number} maxSize - Maximum size in bytes (default 50 MB)
	 * @returns {boolean} Whether the file size is within the limit
	 */
	validateFileSize(file, maxSize = 50 * 1024 * 1024) {
		return file.size <= maxSize;
	}
}

export default new AttachmentService();
