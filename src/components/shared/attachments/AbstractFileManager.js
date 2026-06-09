import {
	clearError,
	fetchAttachments,
	selectAttachments,
	selectAttachmentsError,
	selectAttachmentsErrorMessage,
	selectAttachmentsLoading,
} from "@state/attachmentSlice";
import { __ } from "@wordpress/i18n";
import { Card, Divider, Space, Typography } from "antd";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import FileList from "./FileList";
import FileUpload from "./FileUpload";

const { Title, Text } = Typography;

const AbstractFileManager = ({
	abstractId,
	eventId,
	mode = "submission", // 'submission' or 'review'
	className = "",
}) => {
	const dispatch = useDispatch();

	// Redux state
	const attachments = useSelector(selectAttachments);
	const loading = useSelector(selectAttachmentsLoading);
	const error = useSelector(selectAttachmentsError);
	const errorMessage = useSelector(selectAttachmentsErrorMessage);

	useEffect(() => {
		if (abstractId && eventId) {
			dispatch(
				fetchAttachments({
					entityType: "abstract",
					entityId: abstractId,
					eventId,
				}),
			);
		}
	}, [dispatch, abstractId, eventId]);

	// Clear any errors when component mounts
	useEffect(() => {
		dispatch(clearError());
	}, [dispatch]);

	const handleAttachmentsChange = () => {
		// Refresh attachments after changes
		if (abstractId && eventId) {
			dispatch(
				fetchAttachments({
					entityType: "abstract",
					entityId: abstractId,
					eventId,
				}),
			);
		}
	};

	const getFileTypeConfig = () => {
		const configs = {
			submission: {
				title: __("Abstract Documents", "simplyconf"),
				description: __(
					"Upload supporting documents for your abstract submission",
					"simplyconf",
				),
				allowedTypes: [
					"application/pdf",
					"application/msword",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
					"image/jpeg",
					"image/png",
				],
				maxFileSize: 50 * 1024 * 1024, // 50MB
				canUpload: true,
				canDelete: true,
				categories: [
					{
						purpose: "abstract_pdf",
						title: __("Abstract PDF", "simplyconf"),
						description: __(
							"Main abstract document (PDF format)",
							"simplyconf",
						),
						maxFiles: 1,
						required: true,
						allowedTypes: ["application/pdf"],
					},
					{
						purpose: "supporting_doc",
						title: __("Supporting Documents", "simplyconf"),
						description: __(
							"Additional supporting documents (figures, tables, etc.)",
							"simplyconf",
						),
						maxFiles: 5,
						required: false,
						allowedTypes: [
							"application/pdf",
							"application/msword",
							"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
							"image/jpeg",
							"image/png",
						],
					},
					{
						purpose: "presentation",
						title: __("Presentation Files", "simplyconf"),
						description: __(
							"Presentation slides (if applicable)",
							"simplyconf",
						),
						maxFiles: 2,
						required: false,
						allowedTypes: [
							"application/pdf",
							"application/vnd.ms-powerpoint",
							"application/vnd.openxmlformats-officedocument.presentationml.presentation",
						],
					},
				],
			},
			review: {
				title: __("Review Documents", "simplyconf"),
				description: __(
					"Upload documents related to your review",
					"simplyconf",
				),
				allowedTypes: [
					"application/pdf",
					"application/msword",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				],
				maxFileSize: 25 * 1024 * 1024, // 25MB
				canUpload: true,
				canDelete: true,
				categories: [
					{
						purpose: "review_notes",
						title: __("Review Notes", "simplyconf"),
						description: __("Detailed review notes and comments", "simplyconf"),
						maxFiles: 3,
						required: false,
						allowedTypes: [
							"application/pdf",
							"application/msword",
							"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						],
					},
				],
			},
		};

		return configs[mode] || configs.submission;
	};

	const config = getFileTypeConfig();

	const renderFileCategories = () => {
		return config.categories.map((category) => {
			const categoryFiles = attachments.filter(
				(a) => a.file_purpose === category.purpose,
			);

			return (
				<Card
					key={category.purpose}
					size="small"
					className="file-category-card"
					title={
						<Space>
							<Title level={5} style={{ margin: 0 }}>
								{category.title}
								{category.required && <Text type="danger"> *</Text>}
							</Title>
							<Text type="secondary">
								({categoryFiles.length}/{category.maxFiles} files)
							</Text>
						</Space>
					}
				>
					<Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
						{category.description}
					</Text>

					{/* Upload area for this category */}
					{categoryFiles.length < category.maxFiles && config.canUpload && (
						<FileUpload
							entityType="abstract"
							entityId={abstractId}
							eventId={eventId}
							allowedTypes={category.allowedTypes}
							maxFileSize={config.maxFileSize}
							filePurpose={category.purpose}
							accessLevel="private"
							onFileUploaded={(_newFile) => {
								// File purpose should already be set during upload
								// Just refresh the attachments
								handleAttachmentsChange();
							}}
							accept={category.allowedTypes.join(",")}
							multiple={category.maxFiles > 1}
							className="category-upload"
						/>
					)}

					{/* Files in this category */}
					{categoryFiles.length > 0 && (
						<div className="category-files">
							<Divider />
							<FileList
								attachments={categoryFiles}
								entityType="abstract"
								entityId={abstractId}
								eventId={eventId}
								onAttachmentsChange={handleAttachmentsChange}
								canUpload={false} // Handled above
								canDelete={config.canDelete}
								viewMode="grid"
								allowPreview={true}
								className="category-file-list"
							/>
						</div>
					)}

					{/* Category validation */}
					{category.required && categoryFiles.length === 0 && (
						<Text type="danger" style={{ fontSize: "12px" }}>
							{__("This category requires at least one file", "simplyconf")}
						</Text>
					)}
				</Card>
			);
		});
	};

	if (loading) {
		return (
			<Card loading={true}>
				<div style={{ height: 200 }} />
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<Text type="danger">{errorMessage}</Text>
			</Card>
		);
	}

	return (
		<div className={`abstract-file-manager ${className}`}>
			<div className="file-manager-header">
				<Title level={4}>{config.title}</Title>
				<Text type="secondary">{config.description}</Text>
			</div>

			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				{/* File Categories */}
				<div className="file-categories">{renderFileCategories()}</div>

				{/* General File Manager for uncategorized files */}
				{attachments.some(
					(a) => !config.categories.find((c) => c.purpose === a.file_purpose),
				) && (
					<Card title={__("Other Files", "simplyconf")} size="small">
						<FileList
							attachments={attachments.filter(
								(a) =>
									!config.categories.find((c) => c.purpose === a.file_purpose),
							)}
							entityType="abstract"
							entityId={abstractId}
							eventId={eventId}
							onAttachmentsChange={handleAttachmentsChange}
							canUpload={config.canUpload}
							canDelete={config.canDelete}
							viewMode="list"
							allowPreview={true}
						/>
					</Card>
				)}

				{/* Summary */}
				<Card size="small" className="file-summary">
					<Title level={5}>{__("File Summary", "simplyconf")}</Title>
					<div className="summary-stats">
						{config.categories.map((category) => {
							const categoryFiles = attachments.filter(
								(a) => a.file_purpose === category.purpose,
							);
							const isValid = !category.required || categoryFiles.length > 0;

							return (
								<div key={category.purpose} className="summary-item">
									<Text
										type={isValid ? "success" : "danger"}
										style={{ fontSize: "12px" }}
									>
										{category.title}: {categoryFiles.length}/{category.maxFiles}
										{category.required &&
											!isValid &&
											` (${__("Required", "simplyconf")})`}
									</Text>
								</div>
							);
						})}
						<Divider type="vertical" />
						<Text style={{ fontSize: "12px" }}>
							{__("Total", "simplyconf")}: {attachments.length}{" "}
							{__("files", "simplyconf")}
						</Text>
					</div>
				</Card>
			</Space>
		</div>
	);
};

AbstractFileManager.propTypes = {
	abstractId: PropTypes.number.isRequired,
	eventId: PropTypes.number.isRequired,
	mode: PropTypes.oneOf(["submission", "review"]),
	className: PropTypes.string,
};

export default AbstractFileManager;
