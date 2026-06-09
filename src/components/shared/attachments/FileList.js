import AttachmentService from "@services/attachments";
import { __ } from "@wordpress/i18n";
import { useState } from "react";
import { sprintf } from "sprintf-js";
import FilePreview from "./FilePreview";
import FileUpload from "./FileUpload";

const FileList = ({
	attachments = [],
	entityType,
	entityId,
	eventId,
	onAttachmentsChange,
	canUpload = true,
	canDelete = false,
	canEdit = false,
	viewMode: initialViewMode = "list", // 'list' or 'grid'
	allowPreview = true,
	className = "",
	disabled = false,
}) => {
	// When disabled, override canDelete to prevent deletions
	const effectiveCanDelete = disabled ? false : canDelete;
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [previewFile, setPreviewFile] = useState(null);
	const [sortBy, setSortBy] = useState("created");
	const [sortOrder, setSortOrder] = useState("desc");
	const [filterType, setFilterType] = useState("all");
	const [viewMode, setViewMode] = useState(initialViewMode);

	const handleFileUploaded = (newFiles) => {
		const files = Array.isArray(newFiles) ? newFiles : [newFiles];
		const updatedAttachments = [...files, ...attachments];
		onAttachmentsChange?.(updatedAttachments);
	};

	const handleDownload = async (attachment) => {
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

	const handleDelete = async (attachmentId) => {
		if (
			!confirm(__("Are you sure you want to delete this file?", "simplyconf"))
		) {
			return;
		}

		try {
			await AttachmentService.deleteAttachment(attachmentId);
			const updatedAttachments = attachments.filter(
				(a) => a.attachment_id !== attachmentId,
			);
			onAttachmentsChange?.(updatedAttachments);
		} catch (error) {
			console.error("Delete failed:", error);
			alert(__("Delete failed. Please try again.", "simplyconf"));
		}
	};

	const handleSelectFile = (attachmentId) => {
		setSelectedFiles((prev) => {
			if (prev.includes(attachmentId)) {
				return prev.filter((id) => id !== attachmentId);
			}
			return [...prev, attachmentId];
		});
	};

	const handleSelectAll = () => {
		if (selectedFiles.length === filteredAttachments.length) {
			setSelectedFiles([]);
		} else {
			setSelectedFiles(filteredAttachments.map((a) => a.attachment_id));
		}
	};

	const handleBulkDelete = async () => {
		if (
			!confirm(
				sprintf(
					__(
						"Are you sure you want to delete %d selected files?",
						"simplyconf",
					),
					selectedFiles.length,
				),
			)
		) {
			return;
		}

		try {
			await Promise.all(
				selectedFiles.map((id) => AttachmentService.deleteAttachment(id)),
			);
			const updatedAttachments = attachments.filter(
				(a) => !selectedFiles.includes(a.attachment_id),
			);
			onAttachmentsChange?.(updatedAttachments);
			setSelectedFiles([]);
		} catch (error) {
			console.error("Bulk delete failed:", error);
			alert(
				__("Some files could not be deleted. Please try again.", "simplyconf"),
			);
		}
	};

	const sortAttachments = (attachments) => {
		return [...attachments].sort((a, b) => {
			let aValue = a[sortBy];
			let bValue = b[sortBy];

			if (sortBy === "created" || sortBy === "modified") {
				aValue = new Date(aValue);
				bValue = new Date(bValue);
			}

			if (sortOrder === "asc") {
				return aValue > bValue ? 1 : -1;
			}
			return aValue < bValue ? 1 : -1;
		});
	};

	const filterAttachments = (attachments) => {
		if (filterType === "all") return attachments;

		const typeMap = {
			documents: [
				"application/pdf",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			],
			images: ["image/jpeg", "image/png", "image/gif"],
			videos: ["video/mp4", "video/avi", "video/quicktime"],
			audio: ["audio/mp3", "audio/wav", "audio/ogg"],
		};

		if (typeMap[filterType]) {
			return attachments.filter((a) =>
				typeMap[filterType].includes(a.file_type),
			);
		}

		return attachments.filter((a) => a.file_category === filterType);
	};

	const filteredAttachments = sortAttachments(filterAttachments(attachments));

	const getFileIcon = (fileType) => {
		return AttachmentService.getFileIcon(fileType);
	};

	const formatFileSize = (bytes) => {
		return AttachmentService.formatFileSize(bytes);
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString();
	};

	const renderFileItem = (attachment, _index) => {
		const isSelected = selectedFiles.includes(attachment.attachment_id);

		if (viewMode === "grid") {
			return (
				<div
					key={attachment.attachment_id}
					className={`file-grid-item ${isSelected ? "selected" : ""}`}
				>
					{effectiveCanDelete && (
						<div className="file-checkbox">
							<input
								type="checkbox"
								checked={isSelected}
								onChange={() => handleSelectFile(attachment.attachment_id)}
							/>
						</div>
					)}

					<div className="file-thumbnail">
						<i className={`fas fa-${getFileIcon(attachment.file_type)}`} />
					</div>

					<div className="file-info">
						<div className="file-name" title={attachment.file_name}>
							{attachment.file_name}
						</div>
						<div className="file-size">
							{formatFileSize(attachment.file_size)}
						</div>
					</div>

					<div className="file-actions">
						{allowPreview && (
							<button
								onClick={() => setPreviewFile(attachment)}
								className="btn btn-sm btn-secondary"
								title={__("Preview", "simplyconf")}
							>
								<i className="fas fa-eye" />
							</button>
						)}
						<button
							onClick={() => handleDownload(attachment)}
							className="btn btn-sm btn-primary"
							title={__("Download", "simplyconf")}
						>
							<i className="fas fa-download" />
						</button>
						{effectiveCanDelete && (
							<button
								onClick={() => handleDelete(attachment.attachment_id)}
								className="btn btn-sm btn-danger"
								title={__("Delete", "simplyconf")}
							>
								<i className="fas fa-trash" />
							</button>
						)}
					</div>
				</div>
			);
		}

		// List view
		return (
			<tr
				key={attachment.attachment_id}
				className={isSelected ? "selected" : ""}
			>
				{effectiveCanDelete && (
					<td>
						<input
							type="checkbox"
							checked={isSelected}
							onChange={() => handleSelectFile(attachment.attachment_id)}
						/>
					</td>
				)}
				<td>
					<div className="file-info">
						<i
							className={`fas fa-${getFileIcon(
								attachment.file_type,
							)} file-icon`}
						/>
						<span className="file-name">{attachment.file_name}</span>
					</div>
				</td>
				<td>{formatFileSize(attachment.file_size)}</td>
				<td>{attachment.file_purpose.replace("_", " ")}</td>
				<td>{formatDate(attachment.created)}</td>
				<td>{attachment.download_count}</td>
				<td>
					<div className="file-actions">
						{allowPreview && (
							<button
								onClick={() => setPreviewFile(attachment)}
								className="btn btn-sm btn-secondary"
								title={__("Preview", "simplyconf")}
							>
								<i className="fas fa-eye" />
							</button>
						)}
						<button
							onClick={() => handleDownload(attachment)}
							className="btn btn-sm btn-primary"
							title={__("Download", "simplyconf")}
						>
							<i className="fas fa-download" />
						</button>
						{effectiveCanDelete && (
							<button
								onClick={() => handleDelete(attachment.attachment_id)}
								className="btn btn-sm btn-danger"
								title={__("Delete", "simplyconf")}
							>
								<i className="fas fa-trash" />
							</button>
						)}
					</div>
				</td>
			</tr>
		);
	};

	return (
		<div className={`file-list ${className}`}>
			{canUpload && (
				<div className="file-upload-section">
					<FileUpload
						entityType={entityType}
						entityId={entityId}
						eventId={eventId}
						onFileUploaded={handleFileUploaded}
						multiple={true}
					/>
				</div>
			)}

			<div className="file-list-controls">
				<div className="file-list-header">
					<div className="file-count">
						{sprintf(__("%d files", "simplyconf"), filteredAttachments.length)}
						{selectedFiles.length > 0 &&
							sprintf(__(" (%d selected)", "simplyconf"), selectedFiles.length)}
					</div>

					<div className="file-controls">
						<div className="filter-controls">
							<select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								className="form-control form-control-sm"
							>
								<option value="all">{__("All Files", "simplyconf")}</option>
								<option value="documents">
									{__("Documents", "simplyconf")}
								</option>
								<option value="images">{__("Images", "simplyconf")}</option>
								<option value="videos">{__("Videos", "simplyconf")}</option>
								<option value="audio">{__("Audio", "simplyconf")}</option>
							</select>
						</div>

						<div className="sort-controls">
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className="form-control form-control-sm"
							>
								<option value="created">
									{__("Date Created", "simplyconf")}
								</option>
								<option value="file_name">{__("Name", "simplyconf")}</option>
								<option value="file_size">{__("Size", "simplyconf")}</option>
								<option value="download_count">
									{__("Downloads", "simplyconf")}
								</option>
							</select>
							<button
								onClick={() =>
									setSortOrder(sortOrder === "asc" ? "desc" : "asc")
								}
								className="btn btn-sm btn-secondary"
								title={sprintf(
									__("Sort %s", "simplyconf"),
									sortOrder === "asc"
										? __("Descending", "simplyconf")
										: __("Ascending", "simplyconf"),
								)}
							>
								<i
									className={`fas fa-sort-${
										sortOrder === "asc" ? "up" : "down"
									}`}
								/>
							</button>
						</div>

						<div className="view-controls">
							<button
								onClick={() => setViewMode("list")}
								className={`btn btn-sm ${
									viewMode === "list" ? "btn-primary" : "btn-secondary"
								}`}
								title={__("List View", "simplyconf")}
							>
								<i className="fas fa-list" />
							</button>
							<button
								onClick={() => setViewMode("grid")}
								className={`btn btn-sm ${
									viewMode === "grid" ? "btn-primary" : "btn-secondary"
								}`}
								title={__("Grid View", "simplyconf")}
							>
								<i className="fas fa-th" />
							</button>
						</div>
					</div>
				</div>

				{selectedFiles.length > 0 && effectiveCanDelete && (
					<div className="bulk-actions">
						<button
							onClick={handleBulkDelete}
							className="btn btn-sm btn-danger"
						>
							<i className="fas fa-trash" />
							{sprintf(
								__("Delete Selected (%d)", "simplyconf"),
								selectedFiles.length,
							)}
						</button>
					</div>
				)}
			</div>

			{filteredAttachments.length === 0 ? (
				<div className="no-files">
					<i className="fas fa-file" />
					<p>{__("No files found", "simplyconf")}</p>
				</div>
			) : (
				<div className={`files-container ${viewMode}-view`}>
					{viewMode === "grid" ? (
						<div className="files-grid">
							{filteredAttachments.map(renderFileItem)}
						</div>
					) : (
						<table className="files-table table table-striped">
							<thead>
								<tr>
									{effectiveCanDelete && (
										<th>
											<input
												type="checkbox"
												checked={
													selectedFiles.length === filteredAttachments.length &&
													filteredAttachments.length > 0
												}
												onChange={handleSelectAll}
											/>
										</th>
									)}
									<th>{__("Name", "simplyconf")}</th>
									<th>{__("Size", "simplyconf")}</th>
									<th>{__("Purpose", "simplyconf")}</th>
									<th>{__("Date", "simplyconf")}</th>
									<th>{__("Downloads", "simplyconf")}</th>
									<th>{__("Actions", "simplyconf")}</th>
								</tr>
							</thead>
							<tbody>{filteredAttachments.map(renderFileItem)}</tbody>
						</table>
					)}
				</div>
			)}

			{previewFile && (
				<FilePreview
					attachment={previewFile}
					onClose={() => setPreviewFile(null)}
				/>
			)}
		</div>
	);
};

export default FileList;
