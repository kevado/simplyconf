import AttachmentService from "@services/attachments";
import { uploadAttachment } from "@state/attachmentSlice";
import { __ } from "@wordpress/i18n";
import PropTypes from "prop-types";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";

const FileUpload = ({
	entityType,
	entityId,
	eventId,
	onFileUploaded,
	allowedTypes = [],
	maxFileSize = 50 * 1024 * 1024, // 50MB
	multiple = false,
	accept = "*/*",
	disabled = false,
	className = "",
	filePurpose = "other",
	accessLevel = "private",
}) => {
	const dispatch = useDispatch();
	const [uploading, setUploading] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [error, setError] = useState(null);
	const fileInputRef = useRef(null);

	const validateFile = (file) => {
		// Check file size
		if (file.size > maxFileSize) {
			throw new Error(
				`${__("File size exceeds", "simplyconf")} ${AttachmentService.formatFileSize(
					maxFileSize,
				)} ${__("limit", "simplyconf")}`,
			);
		}

		// Check file type if specified
		if (
			allowedTypes.length > 0 &&
			!AttachmentService.validateFileType(file, allowedTypes)
		) {
			throw new Error(__("File type not allowed", "simplyconf"));
		}

		return true;
	};

	const handleFileUpload = async (files) => {
		if (!files || files.length === 0) return;

		setError(null);
		setUploading(true);

		try {
			const uploadedFiles = [];

			for (let i = 0; i < files.length; i++) {
				const file = files[i];

				// Validate file
				validateFile(file);

				// Upload file using Redux action
				const result = await dispatch(
					uploadAttachment({
						file,
						entityType,
						entityId,
						eventId,
						metadata: {
							filePurpose,
							accessLevel,
							onProgress: (progressEvent) => {
								const progress = Math.round(
									(progressEvent.loaded * 100) / progressEvent.total,
								);
								setUploadProgress(progress);
							},
						},
					}),
				).unwrap();

				uploadedFiles.push(result);
			}

			// Reset states
			setUploading(false);
			setUploadProgress(0);

			// Clear file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			// Notify parent component
			if (onFileUploaded) {
				onFileUploaded(multiple ? uploadedFiles : uploadedFiles[0]);
			}
		} catch (error) {
			setError(error.message || __("Upload failed", "simplyconf"));
			setUploading(false);
			setUploadProgress(0);
		}
	};

	const handleFileSelect = (event) => {
		const files = Array.from(event.target.files);
		handleFileUpload(files);
	};

	const handleDrop = (event) => {
		event.preventDefault();
		setDragOver(false);

		const files = Array.from(event.dataTransfer.files);
		handleFileUpload(files);
	};

	const handleDragOver = (event) => {
		event.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = (event) => {
		event.preventDefault();
		setDragOver(false);
	};

	const openFileDialog = () => {
		if (fileInputRef.current && !disabled && !uploading) {
			fileInputRef.current.click();
		}
	};

	return (
		<div className={`file-upload-container ${className}`}>
			<div
				className={`file-upload-area ${dragOver ? "drag-over" : ""} ${
					disabled ? "disabled" : ""
				}`}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onClick={openFileDialog}
			>
				<input
					ref={fileInputRef}
					type="file"
					multiple={multiple}
					accept={accept}
					onChange={handleFileSelect}
					style={{ display: "none" }}
					disabled={disabled || uploading}
				/>

				{uploading ? (
					<div className="upload-progress">
						<div className="progress-bar">
							<div
								className="progress-fill"
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
						<p>
							{__("Uploading...", "simplyconf")} {uploadProgress}%
						</p>
					</div>
				) : (
					<div className="upload-placeholder">
						<i className="fas fa-cloud-upload-alt" />
						<p>
							{dragOver
								? __("Drop files here", "simplyconf")
								: __("Click to select files or drag and drop", "simplyconf")}
						</p>
						<small>
							{__("Max file size:", "simplyconf")}{" "}
							{AttachmentService.formatFileSize(maxFileSize)}
							{allowedTypes.length > 0 && (
								<span>
									{" "}
									| {__("Allowed types:", "simplyconf")}{" "}
									{allowedTypes.join(", ")}
								</span>
							)}
						</small>
					</div>
				)}
			</div>

			{error && (
				<div className="upload-error">
					<i className="fas fa-exclamation-triangle" />
					{error}
				</div>
			)}
		</div>
	);
};

FileUpload.propTypes = {
	entityType: PropTypes.string.isRequired,
	entityId: PropTypes.number.isRequired,
	eventId: PropTypes.number.isRequired,
	onFileUploaded: PropTypes.func,
	allowedTypes: PropTypes.arrayOf(PropTypes.string),
	maxFileSize: PropTypes.number,
	multiple: PropTypes.bool,
	accept: PropTypes.string,
	disabled: PropTypes.bool,
	className: PropTypes.string,
	filePurpose: PropTypes.string,
	accessLevel: PropTypes.string,
};

export default FileUpload;
