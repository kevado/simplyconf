import {
	CheckCircleOutlined,
	DeleteOutlined,
	FileTextOutlined,
	InboxOutlined,
	LoadingOutlined,
} from "@ant-design/icons";
import AttachmentService from "@services/attachments";
import {
	deleteAttachment,
	fetchAttachments,
	selectAttachments,
} from "@state/attachmentSlice";
import { getSettingByName } from "@state/settingSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Button, Card, Modal, Spin, Typography, Upload } from "antd";
import PropTypes from "prop-types";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sprintf } from "sprintf-js";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const DocumentsStep = ({
	abstractId,
	draftAbstractId,
	abstractData,
	isEdit,
	onBack,
	onNext,
	disabled = false,
}) => {
	const dispatch = useDispatch();
	const [uploadingFile, setUploadingFile] = useState(null);
	// Using feedback utilities

	// Use abstractId for edit mode, draftAbstractId for new abstracts
	const currentAbstractId = abstractId || draftAbstractId;
	const eventId = abstractData.event_id;

	// Get settings
	const showAttachments = useSelector((state) =>
		getSettingByName(state, "show_attachments", eventId),
	);
	const uploadLimit = useSelector((state) =>
		getSettingByName(state, "upload_limit", eventId),
	);
	const maxAttachSize = useSelector((state) =>
		getSettingByName(state, "max_attach_size", eventId),
	);
	const attachmentPref = useSelector((state) =>
		getSettingByName(state, "attachment_pref", eventId),
	);
	const allowedFileTypesSetting = useSelector((state) =>
		getSettingByName(state, "allowed_file_types", eventId),
	);

	// Get current attachments
	const attachments = useSelector(selectAttachments);
	const currentAttachments = attachments.filter(
		(a) =>
			a.entity_type === "abstract" &&
			Number.parseInt(a.entity_id, 10) ===
				Number.parseInt(currentAbstractId, 10),
	);

	// Parse settings values with defaults
	const isAttachmentsEnabled = showAttachments?.value
		? Number.parseInt(showAttachments.value, 10) === 1
		: true;
	const maxFiles = uploadLimit?.value
		? Number.parseInt(uploadLimit.value, 10)
		: 5;
	const maxFileSize = maxAttachSize?.value
		? Number.parseInt(maxAttachSize.value, 10) * 1024 * 1024
		: 50 * 1024 * 1024; // Convert MB to bytes
	const isAttachmentsRequired = attachmentPref?.value === "required";

	// Parse allowed file types from setting
	const allowedFileTypes = allowedFileTypesSetting?.value
		? Array.isArray(allowedFileTypesSetting.value)
			? allowedFileTypesSetting.value
			: JSON.parse(allowedFileTypesSetting.value || "[]")
		: ["pdf", "doc", "ppt", "xls", "jpg", "png"]; // Default to all types

	// Map file type codes to MIME types
	const fileTypeMap = {
		pdf: ["application/pdf"],
		doc: [
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		],
		ppt: [
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		],
		xls: [
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		],
		jpg: ["image/jpeg"],
		png: ["image/png"],
	};

	// Build allowed MIME types array from settings
	const allowedMimeTypes = allowedFileTypes.flatMap(
		(type) => fileTypeMap[type] || [],
	);

	// Build human-readable list of allowed types
	const allowedTypesDisplay = allowedFileTypes
		.map((type) => type.toUpperCase())
		.join(", ");

	// If attachments are disabled, skip this step
	if (!isAttachmentsEnabled) {
		return (
			<div>
				<div style={{ textAlign: "center" }}>
					<Button onClick={onBack} style={{ marginRight: 8 }}>
						{__("Back", "simplyconf")}
					</Button>
					<Button type="primary" onClick={onNext}>
						{__("Continue", "simplyconf")}
					</Button>
				</div>
			</div>
		);
	}

	const handleUpload = async (file) => {
		// Validate file type
		if (!allowedMimeTypes.includes(file.type)) {
			showError(
				sprintf(
					__("File type not allowed. Allowed types: %s", "simplyconf"),
					allowedTypesDisplay,
				),
			);
			return false;
		}

		// Validate file size
		if (file.size > maxFileSize) {
			showError(
				sprintf(
					__('File "%s" exceeds the maximum size of %d MB', "simplyconf"),
					file.name,
					(maxFileSize / (1024 * 1024)).toFixed(0),
				),
			);
			return false;
		}

		// Validate file count
		if (currentAttachments.length >= maxFiles) {
			showError(
				sprintf(__("Maximum of %d files allowed", "simplyconf"), maxFiles),
			);
			return false;
		}

		try {
			// Set uploading state
			setUploadingFile(file.name);

			await AttachmentService.uploadFile(
				file,
				"abstract",
				currentAbstractId,
				eventId,
				{
					filePurpose: "document",
					accessLevel: "private",
				},
			);

			// Refresh attachments
			dispatch(
				fetchAttachments({
					entityType: "abstract",
					entityId: currentAbstractId,
					eventId,
				}),
			);

			showSuccess(
				sprintf(__("%s uploaded successfully", "simplyconf"), file.name),
			);
		} catch (error) {
			console.error("Upload failed:", error);
			showError(sprintf(__("Failed to upload %s", "simplyconf"), file.name));
		} finally {
			// Clear uploading state
			setUploadingFile(null);
		}
		return false; // Prevent default upload behavior
	};

	return (
		<div>
			<Card
				title={
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<FileTextOutlined />
						<span>{__("Upload Documents", "simplyconf")}</span>
						<Text type="secondary">
							({currentAttachments.length}/{maxFiles}{" "}
							{__("files", "simplyconf")})
						</Text>
					</div>
				}
				style={{ marginBottom: 24 }}
			>
				<Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
					{sprintf(
						__(
							"Upload supporting documents for your abstract. Accepted formats: %s.",
							"simplyconf",
						),
						allowedTypesDisplay,
					)}{" "}
					{__("Maximum file size:", "simplyconf")}{" "}
					{(maxFileSize / (1024 * 1024)).toFixed(0)}MB{" "}
					{__("per file", "simplyconf")}.
					{isAttachmentsRequired && currentAttachments.length === 0 && (
						<Text type="danger" style={{ display: "block", marginTop: 8 }}>
							{__("* At least one file is required", "simplyconf")}
						</Text>
					)}
				</Text>

				{currentAttachments.length < maxFiles && (
					<Dragger
						beforeUpload={handleUpload}
						multiple={maxFiles > 1}
						accept={allowedMimeTypes.join(",")}
						showUploadList={false}
						disabled={disabled || uploadingFile !== null}
						style={{
							marginBottom:
								currentAttachments.length > 0 || uploadingFile ? 24 : 0,
						}}
					>
						<p className="ant-upload-drag-icon">
							<InboxOutlined />
						</p>
						<p className="ant-upload-text">
							{__("Click or drag files to upload", "simplyconf")}
						</p>
						<p className="ant-upload-hint">
							{sprintf(
								__("You can upload up to %d more file(s)", "simplyconf"),
								maxFiles - currentAttachments.length,
							)}
						</p>
					</Dragger>
				)}

				{uploadingFile && (
					<div
						style={{
							padding: "16px",
							background: "#e6f7ff",
							border: "1px solid #91d5ff",
							borderRadius: "8px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: 24,
						}}
					>
						<Spin
							indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
						/>
						<div style={{ flex: 1 }}>
							<div
								style={{
									fontWeight: "bold",
									fontSize: "14px",
									marginBottom: "4px",
								}}
							>
								{sprintf(__("Uploading %s...", "simplyconf"), uploadingFile)}
							</div>
							<div style={{ fontSize: "12px", color: "#666" }}>
								{__("Please wait", "simplyconf")}
							</div>
						</div>
					</div>
				)}

				{currentAttachments.length > 0 && (
					<div style={{ marginTop: 24 }}>
						<Title level={5} style={{ marginBottom: 16 }}>
							{__("Uploaded Files", "simplyconf")}
						</Title>
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							{currentAttachments.map((attachment, _index) => (
								<div
									key={attachment.attachment_id}
									style={{
										padding: "16px",
										background: "#f6ffed",
										border: "1px solid #b7eb8f",
										borderRadius: "8px",
										display: "flex",
										alignItems: "center",
										gap: "12px",
									}}
								>
									<CheckCircleOutlined
										style={{ fontSize: "24px", color: "#52c41a" }}
									/>
									<div style={{ flex: 1 }}>
										<div
											style={{
												fontWeight: "bold",
												fontSize: "14px",
												marginBottom: "4px",
											}}
										>
											{attachment.file_name}
										</div>
										<div style={{ fontSize: "12px", color: "#666" }}>
											{(attachment.file_size / 1024).toFixed(2)} KB
										</div>
									</div>
									{!disabled && (
										<Button
											type="text"
											danger
											icon={<DeleteOutlined />}
											onClick={() => {
												Modal.confirm({
													title: __("Delete File", "simplyconf"),
													content: sprintf(
														__(
															'Are you sure you want to delete "%s"?',
															"simplyconf",
														),
														attachment.file_name,
													),
													okText: __("Delete", "simplyconf"),
													okType: "danger",
													onOk: async () => {
														await dispatch(
															deleteAttachment(attachment.attachment_id),
														);
													},
												});
											}}
										>
											{__("Delete", "simplyconf")}
										</Button>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</Card>

			<div style={{ textAlign: "center", marginTop: 24 }}>
				<Button onClick={onBack} style={{ marginRight: 8 }} disabled={disabled}>
					{__("Back", "simplyconf")}
				</Button>
				<Button
					type="primary"
					onClick={onNext}
					disabled={
						disabled ||
						(isAttachmentsRequired && currentAttachments.length === 0)
					}
				>
					{__("Next", "simplyconf")}
				</Button>
			</div>
		</div>
	);
};

DocumentsStep.propTypes = {
	abstractId: PropTypes.number,
	draftAbstractId: PropTypes.number,
	abstractData: PropTypes.shape({
		event_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		title: PropTypes.string,
		description: PropTypes.string,
	}).isRequired,
	isEdit: PropTypes.bool.isRequired,
	onBack: PropTypes.func.isRequired,
	onNext: PropTypes.func.isRequired,
	disabled: PropTypes.bool,
};

export default DocumentsStep;
