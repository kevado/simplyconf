import { InboxOutlined } from "@ant-design/icons";
import AttachmentService from "@services/attachments";
import AttachmentPreview from "@shared/attachments/AttachmentPreview";
import {
	deleteAttachment,
	selectAttachmentById,
	uploadAttachment,
} from "@state/attachmentSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Spin, Typography, Upload } from "antd";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Dragger } = Upload;
const { Text } = Typography;

/**
 * File upload component for custom fields.
 * Stores the attachment_id as the custom field value.
 * Uses the existing attachment system for upload/download/delete.
 */
const CustomFieldFileUpload = ({
	field,
	value,
	onChange,
	disabled = false,
	entityType = "abstract",
	entityId,
}) => {
	const dispatch = useDispatch();
	const eventId = useSelector((state) => state.events.globalId);
	const [uploading, setUploading] = useState(false);
	const [fileInfo, setFileInfo] = useState(null);
	const [loadingInfo, setLoadingInfo] = useState(false);
	const [fetchFailed, setFetchFailed] = useState(false);

	// Look up attachment from Redux store first (populated by parent's fetchAttachments)
	const attachmentId = value ? Number.parseInt(value, 10) : null;
	const storeAttachment = useSelector((state) =>
		attachmentId ? selectAttachmentById(state, attachmentId) : null,
	);

	// Parse allowed types from field options
	const allowedExtensions = field.options
		? field.options
				.split(",")
				.map((ext) => ext.trim())
				.filter(Boolean)
		: [];

	// Build accept string for the Upload component
	const acceptString =
		allowedExtensions.length > 0
			? allowedExtensions.join(",")
			: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif";

	// Resolve file info: prefer local state (just uploaded), then Redux store
	const resolvedFileInfo = fileInfo || storeAttachment;

	// If we have a value but no resolved info yet, fetch single attachment by ID
	useEffect(() => {
		if (attachmentId && !resolvedFileInfo && !loadingInfo && !fetchFailed) {
			setLoadingInfo(true);
			AttachmentService.getById(attachmentId)
				.then((attachment) => {
					if (attachment) {
						setFileInfo(attachment);
					} else {
						setFetchFailed(true);
					}
				})
				.catch(() => {
					// Attachment may have been deleted — stop retrying
					setFetchFailed(true);
				})
				.finally(() => setLoadingInfo(false));
		}
	}, [attachmentId, resolvedFileInfo, loadingInfo, fetchFailed]);

	const handleUpload = useCallback(
		async (file) => {
			if (!entityId || !eventId) {
				showError(
					__(
						"Cannot upload file: missing entity or event context",
						"simplyconf",
					),
				);
				return false;
			}

			setUploading(true);
			try {
				const result = await dispatch(
					uploadAttachment({
						file,
						entityType,
						entityId,
						eventId,
						metadata: {
							filePurpose: "custom_field",
						},
					}),
				).unwrap();

				// Store attachment_id as the custom field value
				const newAttachmentId = String(result.attachment_id);
				if (onChange) {
					onChange(newAttachmentId);
				}
				setFileInfo(result);
				setFetchFailed(false);
				showSuccess(__("File uploaded successfully", "simplyconf"));
			} catch (error) {
				showError(error?.message || __("Failed to upload file", "simplyconf"));
			} finally {
				setUploading(false);
			}

			// Prevent default upload behavior (we handle it manually)
			return false;
		},
		[dispatch, entityType, entityId, eventId, onChange],
	);

	const handleRemove = useCallback(async () => {
		if (!value) return;

		try {
			await dispatch(deleteAttachment(attachmentId)).unwrap();
			if (onChange) {
				onChange("");
			}
			setFileInfo(null);
			setFetchFailed(false);
			showSuccess(__("File removed", "simplyconf"));
		} catch (error) {
			showError(error?.message || __("Failed to remove file", "simplyconf"));
		}
	}, [dispatch, value, attachmentId, onChange]);

	const handleDownload = useCallback(async () => {
		if (!attachmentId) return;

		try {
			const response = await AttachmentService.downloadFile(attachmentId);
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", resolvedFileInfo?.file_name || "download");
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (_error) {
			showError(__("Failed to download file", "simplyconf"));
		}
	}, [attachmentId, resolvedFileInfo]);

	// If attachment was deleted but value still references it, clear the stale value
	useEffect(() => {
		if (value && fetchFailed && !resolvedFileInfo && onChange) {
			onChange("");
		}
	}, [value, fetchFailed, resolvedFileInfo, onChange]);

	if (loadingInfo && !resolvedFileInfo) {
		return <Spin size="small" />;
	}

	// Show current file if one is uploaded
	if (value && resolvedFileInfo) {
		return (
			<AttachmentPreview
				attachment={resolvedFileInfo}
				onDownload={handleDownload}
				onRemove={disabled ? undefined : handleRemove}
				disabled={disabled}
			/>
		);
	}

	// Show upload area
	if (disabled) {
		return <Text type="secondary">{__("No file uploaded", "simplyconf")}</Text>;
	}

	return (
		<Dragger
			accept={acceptString}
			beforeUpload={handleUpload}
			showUploadList={false}
			disabled={uploading}
			multiple={false}
		>
			{uploading ? (
				<div style={{ padding: "20px 0" }}>
					<Spin />
					<p style={{ marginTop: 8 }}>{__("Uploading...", "simplyconf")}</p>
				</div>
			) : (
				<div style={{ padding: "20px 0" }}>
					<p className="ant-upload-drag-icon">
						<InboxOutlined />
					</p>
					<p className="ant-upload-text">
						{__("Click or drag a file to upload", "simplyconf")}
					</p>
					{field.help_text && (
						<p className="ant-upload-hint">{field.help_text}</p>
					)}
				</div>
			)}
		</Dragger>
	);
};

CustomFieldFileUpload.propTypes = {
	field: PropTypes.shape({
		field_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
			.isRequired,
		options: PropTypes.string,
		help_text: PropTypes.string,
	}).isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	onChange: PropTypes.func,
	disabled: PropTypes.bool,
	entityType: PropTypes.string,
	entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CustomFieldFileUpload;
