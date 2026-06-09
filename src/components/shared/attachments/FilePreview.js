import AttachmentService from "@services/attachments";
import { __ } from "@wordpress/i18n";
import { useState } from "react";
import { sprintf } from "sprintf-js";

const FilePreview = ({ attachment, onClose, className = "" }) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);

	const isImage = (fileType) => {
		return fileType.startsWith("image/");
	};

	const isPDF = (fileType) => {
		return fileType === "application/pdf";
	};

	const isVideo = (fileType) => {
		return fileType.startsWith("video/");
	};

	const isAudio = (fileType) => {
		return fileType.startsWith("audio/");
	};

	const canPreview = (fileType) => {
		return (
			isImage(fileType) ||
			isPDF(fileType) ||
			isVideo(fileType) ||
			isAudio(fileType)
		);
	};

	const handlePreview = async () => {
		if (!canPreview(attachment.file_type)) {
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await AttachmentService.downloadFile(
				attachment.attachment_id,
			);
			const blob = new Blob([response.data], { type: attachment.file_type });
			const url = URL.createObjectURL(blob);
			setPreviewUrl(url);
		} catch (error) {
			setError(__("Failed to load preview", "simplyconf"));
			console.error("Preview error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async () => {
		try {
			const response = await AttachmentService.downloadFile(
				attachment.attachment_id,
			);
			const blob = new Blob([response.data], { type: attachment.file_type });
			const url = window.URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.download = attachment.file_name;
			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download failed:", error);
			alert(__("Download failed. Please try again.", "simplyconf"));
		}
	};

	const renderPreview = () => {
		if (loading) {
			return (
				<div className="preview-loading">
					<i className="fas fa-spinner fa-spin" />
					{__("Loading preview...", "simplyconf")}
				</div>
			);
		}

		if (error) {
			return (
				<div className="preview-error">
					<i className="fas fa-exclamation-triangle" />
					{error}
				</div>
			);
		}

		if (!previewUrl) {
			if (canPreview(attachment.file_type)) {
				return (
					<div className="preview-placeholder">
						<button onClick={handlePreview} className="btn btn-primary">
							<i className="fas fa-eye" />
							{__("Load Preview", "simplyconf")}
						</button>
					</div>
				);
			}
			return (
				<div className="preview-not-available">
					<i className="fas fa-file" />
					<p>{__("Preview not available for this file type", "simplyconf")}</p>
					<button onClick={handleDownload} className="btn btn-primary">
						<i className="fas fa-download" />
						{__("Download to View", "simplyconf")}
					</button>
				</div>
			);
		}

		if (isImage(attachment.file_type)) {
			return (
				<img
					src={previewUrl}
					alt={attachment.file_name}
					className="preview-image"
				/>
			);
		}

		if (isPDF(attachment.file_type)) {
			return (
				<iframe
					src={previewUrl}
					className="preview-pdf"
					title={attachment.file_name}
				/>
			);
		}

		if (isVideo(attachment.file_type)) {
			return (
				<video controls className="preview-video" src={previewUrl}>
					{__("Your browser does not support video playback.", "simplyconf")}
				</video>
			);
		}

		if (isAudio(attachment.file_type)) {
			return (
				<audio controls className="preview-audio" src={previewUrl}>
					{__("Your browser does not support audio playback.", "simplyconf")}
				</audio>
			);
		}

		return null;
	};

	return (
		<div className={`file-preview-modal ${className}`}>
			<div className="modal-backdrop" onClick={onClose} />
			<div className="modal-content">
				<div className="modal-header">
					<div className="file-info">
						<h4>{attachment.file_name}</h4>
						<div className="file-meta">
							<span>
								{AttachmentService.formatFileSize(attachment.file_size)}
							</span>
							<span>{new Date(attachment.created).toLocaleDateString()}</span>
							{attachment.download_count > 0 && (
								<span>
									{sprintf(
										__("%d downloads", "simplyconf"),
										attachment.download_count,
									)}
								</span>
							)}
						</div>
					</div>
					<div className="modal-actions">
						<button
							onClick={handleDownload}
							className="btn btn-secondary"
							title={__("Download", "simplyconf")}
						>
							<i className="fas fa-download" />
						</button>
						<button
							onClick={onClose}
							className="btn btn-secondary"
							title={__("Close", "simplyconf")}
						>
							<i className="fas fa-times" />
						</button>
					</div>
				</div>

				<div className="modal-body">
					<div className="preview-container">{renderPreview()}</div>
				</div>

				<div className="modal-footer">
					<div className="file-details">
						<div className="detail-item">
							<strong>{__("Type:", "simplyconf")}</strong>{" "}
							{attachment.file_type}
						</div>
						<div className="detail-item">
							<strong>{__("Purpose:", "simplyconf")}</strong>{" "}
							{attachment.file_purpose.replace("_", " ")}
						</div>
						<div className="detail-item">
							<strong>{__("Access:", "simplyconf")}</strong>{" "}
							{attachment.access_level}
						</div>
						{attachment.version > 1 && (
							<div className="detail-item">
								<strong>{__("Version:", "simplyconf")}</strong>{" "}
								{attachment.version}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default FilePreview;
