import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	DownloadOutlined,
	EditOutlined,
	EnvironmentOutlined,
	ExclamationCircleOutlined,
	FileOutlined,
	FilePdfOutlined,
	FileTextOutlined,
	InfoCircleOutlined,
	ScheduleOutlined,
	SettingOutlined,
	SyncOutlined,
	TeamOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { useVisibleCustomFields } from "@hooks/useConditionalFields";
import { useTerminology } from "@hooks/useTerminology";
import AttachmentService from "@services/attachments";
import userService from "@services/users";
import CustomFieldFileUpload from "@shared/customFields/CustomFieldFileUpload";
import { exportAbstractPDF, getAbstractById } from "@state/abstractSlice";
import {
	fetchAttachments,
	selectAttachmentsError,
	selectAttachmentsLoading,
	selectFilteredAttachments,
} from "@state/attachmentSlice";
import { fetchCustomFields } from "@state/customFieldsSlice";
import { getEvents } from "@state/eventSlice";
import { getSettings } from "@state/settingSlice";
import { fetchStatuses, selectStatuses } from "@state/statusSlice";
import { getTracks } from "@state/trackSlice";
import { hasAddon } from "@utils/addons";
import { downloadBase64File } from "@utils/download";
import { showError, showInfo, showSuccess, showWarning } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Avatar,
	Badge,
	Button,
	Card,
	Col,
	Empty,
	FloatButton,
	Row,
	Space,
	Spin,
	Statistic,
	Table,
	Tag,
	Timeline,
	Typography,
} from "antd";
import PropTypes from "prop-types";
import { isValidElement, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { sprintf } from "sprintf-js";

const { Text } = Typography;

const SubmissionView = ({
	abstractId,
	showNavigation = true,
	showActions = true,
	onBack = null,
	context = "frontend", // 'frontend' or 'admin'
	showHeader = true,
	submissionData = null,
}) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	// Using feedback utilities
	const [loading, setLoading] = useState(true);
	const [submission, setSubmission] = useState(null);
	const [customFields, setCustomFields] = useState([]);
	const [authorCustomFields, setAuthorCustomFields] = useState([]);
	const [authorInfo, setAuthorInfo] = useState(null);

	const eventId = window.simplyconf?.eventId || 1;

	// Get data from Redux store
	const { tracks } = useSelector((state) => state.tracks);

	const { events } = useSelector((state) => state.events);

	const { getTerm } = useTerminology();

	// Get current user info
	const currentUser = useSelector((state) => state.auth?.user);

	// Get review settings
	const settings = useSelector(
		(state) => state.settings?.settings?.review || [],
	);
	const blindReviewSetting = settings.find((s) => s.name === "blind_review");
	const isBlindReview =
		blindReviewSetting?.value === "1" || blindReviewSetting?.value === 1;

	// Check if current user is a reviewer (event_roles is already in auth state)
	const currentUserRoles = currentUser?.event_roles || [];
	const isReviewer = currentUserRoles.includes("reviewer");

	// Check if current user is the submitter of this abstract
	const isSubmitter =
		Number.parseInt(submission?.submit_by, 10) ===
		Number.parseInt(currentUser?.user_id, 10);

	// Determine if we should hide author information
	// Hide only if blind review is enabled AND user is a reviewer AND user is NOT the submitter
	const shouldHideAuthorInfo = isBlindReview && isReviewer && !isSubmitter;

	// Add status selectors
	const statuses = useSelector((state) =>
		selectStatuses(eventId, "abstract")(state),
	);
	const statusesLoading = useSelector((state) => state.statuses.isLoading);

	// Add attachment selectors
	const attachments = useSelector(selectFilteredAttachments);
	const attachmentsLoading = useSelector(selectAttachmentsLoading);
	const _attachmentsError = useSelector(selectAttachmentsError);

	// Export PDF handler
	const handleExportPDF = async () => {
		if (!hasAddon("exports")) {
			showWarning(
				__(
					"Please install and activate the Exports Add-on to export Abstracts to PDF.",
					"simplyconf",
				),
			);
			return;
		}

		try {
			showInfo(__("Generating PDF...", "simplyconf"));
			const result = await dispatch(exportAbstractPDF(abstractId)).unwrap();
			downloadBase64File(result.content, result.filename);
			showSuccess(__("PDF exported successfully", "simplyconf"));
		} catch (error) {
			console.error("Error exporting PDF:", error);
			showError(__("Failed to export PDF", "simplyconf"));
		}
	};

	// Keep submission in sync when submissionData changes (wizard edits)
	// without re-fetching all supporting data.
	useEffect(() => {
		if (submissionData && submission) {
			setSubmission((prev) => ({
				...prev,
				title: submissionData.title ?? prev.title,
				description: submissionData.description ?? prev.description,
				track_id: submissionData.track_id ?? prev.track_id,
				custom_fields: submissionData.custom_fields ?? prev.custom_fields,
				authors: submissionData.authors ?? prev.authors,
			}));
		}
	}, [submissionData, submission]);

	useEffect(() => {
		const loadSubmission = async () => {
			try {
				setLoading(true);

				// Always fetch from API to get full record with metadata
				// (status_name, status_color, abstract_id, submit_by, etc.)
				const abstractResponse = await dispatch(
					getAbstractById(abstractId),
				).unwrap();

				// If submissionData is provided (wizard review step), overlay
				// only the editable fields on top of the API metadata so we
				// never clobber joined columns (status_name, status_color, etc.).
				const merged = submissionData
					? {
							...abstractResponse,
							title: submissionData.title ?? abstractResponse.title,
							description:
								submissionData.description ?? abstractResponse.description,
							track_id: submissionData.track_id ?? abstractResponse.track_id,
							custom_fields:
								submissionData.custom_fields ?? abstractResponse.custom_fields,
							authors: submissionData.authors ?? abstractResponse.authors,
						}
					: abstractResponse;
				setSubmission(merged);

				// Fetch author information if available
				if (abstractResponse.submit_by) {
					try {
						const authorResponse = await userService.getById(
							abstractResponse.submit_by,
						);
						if (authorResponse?.user_id) {
							setAuthorInfo(authorResponse);
						}
					} catch (error) {
						console.error("Error loading author info:", error);
					}
				}

				// Fetch custom fields for proper display labels
				const fieldsResponse = await dispatch(
					fetchCustomFields({ event_id: eventId, usage: "abstract" }),
				).unwrap();
				setCustomFields(fieldsResponse);

				// Fetch author custom fields for author information display
				const authorFieldsResponse = await dispatch(
					fetchCustomFields({ event_id: eventId, usage: "author" }),
				).unwrap();
				setAuthorCustomFields(authorFieldsResponse);

				// Fetch tracks and events for comprehensive view
				// Use the abstract's own event_id so we don't overwrite Redux
				// settings state with a different event's data (which would cause
				// isAttachmentsEnabled / isAuthorsEnabled to flip in AbstractSubmission).
				const absEventId =
					Number.parseInt(abstractResponse.event_id, 10) || eventId;

				dispatch(getTracks(absEventId));
				dispatch(getEvents());
				dispatch(fetchStatuses({ eventId: absEventId, type: "abstract" }));

				// Fetch settings (including blind_review)
				await dispatch(getSettings(absEventId));

				// Fetch attachments for this abstract
				dispatch(
					fetchAttachments({
						entityType: "abstract",
						entityId: abstractId,
						eventId: abstractResponse.event_id,
					}),
				);
			} catch (error) {
				console.error("Error loading submission:", error);
				showError(__("Failed to load submission details", "simplyconf"));
				if (onBack) {
					onBack();
				} else if (navigate && context === "frontend") {
					navigate("/submissions");
				}
			} finally {
				setLoading(false);
			}
		};

		if (abstractId) {
			loadSubmission();
		}
	}, [
		abstractId,
		dispatch,
		navigate,
		eventId,
		onBack,
		context,
		submissionData,
	]);

	// Helper function to get field label by field_id
	const getFieldLabel = (fieldId) => {
		const fieldConfig = customFields.find((f) => f.field_id === fieldId);
		return (
			fieldConfig?.label ||
			fieldConfig?.name ||
			sprintf(__("Field %s", "simplyconf"), fieldId)
		);
	};

	// Helper function to get field display order
	const getFieldDisplayOrder = (fieldId) => {
		const fieldConfig = customFields.find((f) => f.field_id === fieldId);
		return fieldConfig?.display_order || 999;
	};

	// Helper functions to get related data
	const getTrackName = (trackId) => {
		// First check if track name is already in submission data
		if (submission?.track_name) return submission.track_name;

		if (!tracks || !Array.isArray(tracks))
			return __("Unknown Track", "simplyconf");
		const track = tracks.find(
			(t) => t.id === trackId || t.track_id === trackId,
		);
		return track?.name || __("Unknown Track", "simplyconf");
	};

	const getSessionName = () => {
		// Session name comes from abstract data (joined from sessions table)
		return submission?.session_name || __("Assigned Session", "simplyconf");
	};

	const getEventName = (eventId) => {
		if (!events || typeof events !== "object")
			return __("Unknown Event", "simplyconf");
		// Events are stored as an object, so we need to access by key
		const event = events[eventId];
		return event?.name || __("Unknown Event", "simplyconf");
	};

	// Map colors to appropriate Ant Design colors
	const getTagColor = (color) => {
		if (!color) return "default";

		// Handle hex colors
		if (color.startsWith("#")) {
			switch (color.toLowerCase()) {
				case "#dc3545":
				case "#ff4d4f":
					return "red";
				case "#28a745":
				case "#52c41a":
					return "green";
				case "#ffc107":
				case "#faad14":
					return "orange";
				case "#17a2b8":
				case "#1890ff":
					return "blue";
				case "#6c757d":
					return "default";
				default:
					return "blue";
			}
		}

		// Handle named colors
		switch (color.toLowerCase()) {
			case "red":
			case "danger":
				return "red";
			case "green":
			case "success":
				return "green";
			case "yellow":
			case "warning":
				return "orange";
			case "blue":
			case "primary":
				return "blue";
			case "gray":
			case "grey":
			case "secondary":
				return "default";
			default:
				return "blue";
		}
	};

	// Get appropriate icon based on status name
	const getStatusIcon = (name) => {
		const lowerName = name.toLowerCase();
		if (lowerName.includes("draft")) return <EditOutlined />;
		if (lowerName.includes("submit") || lowerName.includes("review"))
			return <ClockCircleOutlined />;
		if (lowerName.includes("accept") || lowerName.includes("approve"))
			return <CheckCircleOutlined />;
		if (lowerName.includes("reject") || lowerName.includes("decline"))
			return <ExclamationCircleOutlined />;
		if (lowerName.includes("revision") || lowerName.includes("revise"))
			return <SyncOutlined />;
		return <ClockCircleOutlined />;
	};

	// Status rendering with dynamic statuses
	const getStatusTag = (status, record) => {
		// If we have status data directly in the record (from backend join), use it
		if (record?.status_name) {
			const statusObj = {
				name: record.status_name,
				label: record.status_label || record.status_name,
				color: record.status_color || "blue",
			};

			const tagColor = getTagColor(statusObj.color);
			const icon = getStatusIcon(statusObj.name);

			return (
				<Tag
					icon={icon}
					color={tagColor}
					style={{
						fontWeight: "500",
						borderRadius: "6px",
						padding: "4px 8px",
						fontSize: "12px",
					}}
				>
					{statusObj.label}
				</Tag>
			);
		}

		// Fallback to Redux store lookup for cases where direct data isn't available
		// Show loading state if statuses are still loading
		if (statusesLoading) {
			return (
				<Tag icon={<ClockCircleOutlined />} color="default">
					{__("Loading...", "simplyconf")}
				</Tag>
			);
		}

		// Handle case where statuses aren't loaded yet
		if (!statuses || !Array.isArray(statuses) || statuses.length === 0) {
			return (
				<Tag icon={<ExclamationCircleOutlined />} color="default">
					{__("Unknown", "simplyconf")}
				</Tag>
			);
		}

		// Find the dynamic status by ID
		const statusObj = statuses.find(
			(s) => Number.parseInt(s.status_id, 10) === Number.parseInt(status, 10),
		);

		if (!statusObj) {
			return (
				<Tag icon={<ExclamationCircleOutlined />} color="default">
					{sprintf(__("Unknown (ID: %s)", "simplyconf"), status)}
				</Tag>
			);
		}

		const tagColor = getTagColor(statusObj.color);
		const icon = getStatusIcon(statusObj.name);

		return (
			<Tag
				icon={icon}
				color={tagColor}
				style={{
					fontWeight: "500",
					borderRadius: "6px",
					padding: "4px 8px",
					fontSize: "12px",
				}}
			>
				{statusObj.label || statusObj.name}
			</Tag>
		);
	};

	// Attachment helper functions
	const getFileTypeIcon = (fileType) => {
		const icons = {
			"application/pdf": "📄",
			"application/msword": "📝",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				"📝",
			"image/jpeg": "🖼️",
			"image/png": "🖼️",
			"image/gif": "🖼️",
		};
		return icons[fileType] || "📎";
	};

	// Attachment event handlers
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
			showError(__("Download failed. Please try again.", "simplyconf"));
		}
	};

	// Get attachments for this specific abstract (filtered below after sortedCustomFields)
	const allAbstractAttachments = Array.isArray(attachments)
		? attachments.filter(
				(attachment) =>
					attachment.entity_type === "abstract" &&
					Number.parseInt(attachment.entity_id, 10) ===
						Number.parseInt(abstractId, 10),
			)
		: [];

	// Attachment table columns
	const attachmentColumns = [
		{
			title: __("File", "simplyconf"),
			dataIndex: "file_name",
			key: "file_name",
			render: (text, record) => (
				<Space>
					<span style={{ fontSize: "16px" }}>
						{getFileTypeIcon(record.file_type)}
					</span>
					<div>
						<div style={{ fontWeight: "bold" }}>{text}</div>
						<div style={{ fontSize: "12px", color: "#8c8c8c" }}>
							{AttachmentService.formatFileSize(record.file_size)}
						</div>
					</div>
				</Space>
			),
		},
		{
			title: __("Uploaded", "simplyconf"),
			dataIndex: "created",
			key: "created",
			render: (date) => new Date(date).toLocaleDateString(),
		},
		{
			title: __("Actions", "simplyconf"),
			key: "actions",
			render: (_, record) => (
				<Space>
					<Button
						size="small"
						icon={<DownloadOutlined />}
						onClick={() => handleDownload(record)}
						title={__("Download", "simplyconf")}
					/>
				</Space>
			),
		},
	];

	// Initialize conditional logic variables with safe defaults
	// These need to be called before any early returns to maintain hook order
	const submissionFormValues = useMemo(() => {
		if (!submission?.custom_fields || !customFields.length) {
			return {};
		}

		const values = {};
		submission.custom_fields.forEach((field) => {
			const fieldConfig = customFields.find(
				(f) => f.field_id === field.field_id,
			);
			if (fieldConfig) {
				// Use the same field name logic as CustomFieldRenderer
				const fieldName =
					fieldConfig.label || fieldConfig.field_id || fieldConfig.name;
				values[fieldName] = field.value;
			}
		});
		return values;
	}, [submission?.custom_fields, customFields]);

	// Get visible custom fields with their values attached
	const visibleCustomFieldsWithValues = useVisibleCustomFields(
		customFields,
		submissionFormValues,
		submission?.custom_fields,
	);

	// Sort visible custom fields by display order
	const sortedCustomFields = visibleCustomFieldsWithValues
		? [...visibleCustomFieldsWithValues].sort((a, b) => {
				const orderA = getFieldDisplayOrder(a.field_id);
				const orderB = getFieldDisplayOrder(b.field_id);
				return orderA - orderB;
			})
		: [];

	// Exclude custom field file uploads from the Attachments card
	const customFieldAttachmentIds = sortedCustomFields
		.filter((f) => f.type === "file_upload" && f.value)
		.map((f) => Number.parseInt(f.value, 10));
	const abstractAttachments = allAbstractAttachments.filter(
		(a) =>
			!customFieldAttachmentIds.includes(Number.parseInt(a.attachment_id, 10)),
	);

	if (loading) {
		return (
			<div style={{ textAlign: "center", padding: "60px 20px" }}>
				<Spin size="large" />
				<div style={{ marginTop: 16, color: "#8c8c8c" }}>
					{__("Loading submission details...", "simplyconf")}
				</div>
			</div>
		);
	}

	if (!submission) {
		return (
			<Alert
				message={__("Submission Not Found", "simplyconf")}
				description={__(
					"The requested submission could not be found.",
					"simplyconf",
				)}
				type="error"
				showIcon
				style={{ margin: "20px" }}
				action={
					showNavigation && (
						<Button
							type="primary"
							onClick={
								onBack ||
								(() =>
									context === "frontend" ? navigate("/submissions") : null)
							}
						>
							{context === "frontend"
								? __("Back to Submissions", "simplyconf")
								: __("Close", "simplyconf")}
						</Button>
					)
				}
			/>
		);
	}

	// Container style
	const containerStyle = {
		minHeight: "100vh",
	};

	return (
		<div style={containerStyle}>
			<FloatButton.BackTop />

			{/* Header Section with Navigation */}
			{showHeader && (
				<div style={{ maxWidth: "1200px", margin: "0 auto" }}>
					<Row
						gutter={[24, 16]}
						align="middle"
						style={{ marginBottom: "24px" }}
					>
						<Col flex="auto">
							<h1
								style={{
									margin: 0,
								}}
							>
								{submission.title ||
									sprintf(
										__("Untitled %s", "simplyconf"),
										getTerm("abstract", 1),
									)}
							</h1>
							<Space size="middle" wrap>
								<Space size="small">
									<Text type="secondary">{__("ID:", "simplyconf")}</Text>
									<Badge
										count={submission.abstract_id}
										showZero
										style={{ fontWeight: 500 }}
										overflowCount={999999}
									/>
								</Space>
								<Space size="small">
									<Text type="secondary">{__("Status:", "simplyconf")}</Text>
									{getStatusTag(submission.status, submission)}
								</Space>
							</Space>
						</Col>
						<Col>
							<div
								style={{ display: "flex", gap: "16px", alignItems: "center" }}
							>
								{showActions && context === "frontend" && (
									<>
										{hasAddon("exports") && (
											<Button
												icon={<FilePdfOutlined />}
												size="large"
												onClick={handleExportPDF}
											>
												{__("Export PDF", "simplyconf")}
											</Button>
										)}
										<Button
											type="primary"
											icon={<EditOutlined />}
											size="large"
											onClick={() =>
												navigate(`/submissions/edit/${submission.abstract_id}`)
											}
										>
											{sprintf(
												__("Edit %s", "simplyconf"),
												getTerm("abstract", 1),
											)}
										</Button>
									</>
								)}
								{showActions && context === "admin" && (
									<Button
										icon={<FilePdfOutlined />}
										size="large"
										onClick={handleExportPDF}
									>
										{__("Export PDF", "simplyconf")}
									</Button>
								)}
							</div>
						</Col>
					</Row>
				</div>
			)}

			{/* Main Content */}
			<div
				style={{
					maxWidth: "1200px",
					margin: "0 auto",
				}}
			>
				<Row gutter={[24, 24]}>
					{/* Left Column - Main Content */}
					<Col xs={24} lg={16}>
						{/* Submission Overview Card */}
						<Card
							title={
								<Space>
									<FileTextOutlined style={{ color: "#722ed1" }} />
									<span>{__("Description", "simplyconf")}</span>
								</Space>
							}
							style={{
								marginBottom: "24px",
								boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
								borderRadius: "8px",
							}}
						>
							{submission.description && (
								<div
									style={{
										marginBottom: "20px",
										fontSize: "15px",
										lineHeight: "1.6",
									}}
									dangerouslySetInnerHTML={{
										__html: submission.description || "",
									}}
								/>
							)}
						</Card>

						{/* Custom Fields Card */}
						{sortedCustomFields.length > 0 && (
							<Card
								title={
									<Space>
										<SettingOutlined style={{ color: "#722ed1" }} />
										<span>{__("Additional Information", "simplyconf")}</span>
									</Space>
								}
								style={{
									marginBottom: "24px",
									boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
									borderRadius: "8px",
								}}
							>
								<Row gutter={[16, 16]}>
									{sortedCustomFields.map((field) => {
										let displayValue = field.value;

										// File upload fields: render as download link or "No file" message
										if (field.type === "file_upload") {
											return (
												<Col xs={24} sm={12} key={field.field_id}>
													<div
														style={{
															background: "#f8f9fa",
															padding: "16px",
															borderRadius: "6px",
															border: "1px solid #e8e8e8",
														}}
													>
														<div
															style={{
																display: "block",
																marginBottom: "8px",
																color: "#262626",
																fontWeight: "bold",
															}}
														>
															{getFieldLabel(field.field_id)}
														</div>
														{displayValue ? (
															<CustomFieldFileUpload
																field={field}
																value={displayValue}
																disabled
															/>
														) : (
															<div style={{ color: "#8c8c8c" }}>
																{__("No file uploaded", "simplyconf")}
															</div>
														)}
													</div>
												</Col>
											);
										}

										// Handle array values (checkboxes, multi-select)
										if (Array.isArray(displayValue)) {
											// Check if it's an array of objects with field_id/value structure
											if (
												displayValue.length > 0 &&
												typeof displayValue[0] === "object" &&
												displayValue[0].value !== undefined
											) {
												// Extract values from array of objects
												displayValue = displayValue
													.map((item) => item.value || "")
													.filter((val) => val.trim() !== "")
													.join(", ");
											} else {
												// Regular array of strings
												displayValue = displayValue.join(", ");
											}
										}

										// Handle object values (single object with field_id/value)
										if (
											typeof displayValue === "object" &&
											displayValue !== null &&
											!Array.isArray(displayValue)
										) {
											// Handle nested object structures
											if (displayValue.value !== undefined) {
												// If value is still an object, extract its value
												if (
													typeof displayValue.value === "object" &&
													displayValue.value !== null
												) {
													displayValue =
														displayValue.value.value ||
														JSON.stringify(displayValue.value);
												} else {
													displayValue = displayValue.value;
												}
											} else {
												displayValue = JSON.stringify(displayValue);
											}
										}

										// Handle boolean values
										if (typeof displayValue === "boolean") {
											displayValue = displayValue
												? __("Yes", "simplyconf")
												: __("No", "simplyconf");
										}

										// Handle empty values
										if (!displayValue || displayValue === "") {
											displayValue = (
												<div style={{ color: "#8c8c8c" }}>
													{__("Not provided", "simplyconf")}
												</div>
											);
										}

										return (
											<Col xs={24} sm={12} key={field.field_id}>
												<div
													style={{
														background: "#f8f9fa",
														padding: "16px",
														borderRadius: "6px",
														border: "1px solid #e8e8e8",
													}}
												>
													<div
														style={{
															display: "block",
															marginBottom: "8px",
															color: "#262626",
															fontWeight: "bold",
														}}
													>
														{getFieldLabel(field.field_id)}
													</div>
													<div style={{ whiteSpace: "pre-wrap" }}>
														{typeof displayValue === "string" ||
														typeof displayValue === "number"
															? displayValue
															: isValidElement(displayValue)
																? displayValue
																: typeof displayValue === "object" &&
																		displayValue !== null
																	? JSON.stringify(displayValue)
																	: displayValue?.toString() || "N/A"}
													</div>
												</div>
											</Col>
										);
									})}
								</Row>
							</Card>
						)}

						{/* Attachments Card */}
						<Card
							title={
								<Space>
									<FileOutlined style={{ color: "#1890ff" }} />
									<span>{__("Attachments", "simplyconf")}</span>
									{abstractAttachments.length > 0 && (
										<Tag color="blue">{abstractAttachments.length}</Tag>
									)}
								</Space>
							}
							style={{
								marginBottom: "24px",
								boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
								borderRadius: "8px",
							}}
						>
							{attachmentsLoading ? (
								<div style={{ textAlign: "center", padding: "20px" }}>
									<Spin size="small" />
									<div style={{ marginTop: 8, color: "#8c8c8c" }}>
										{__("Loading attachments...", "simplyconf")}
									</div>
								</div>
							) : abstractAttachments.length === 0 ? (
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={
										<div style={{ color: "#8c8c8c" }}>
											{__(
												"No attachments found for this submission.",
												"simplyconf",
											)}
										</div>
									}
								/>
							) : (
								<Table
									dataSource={abstractAttachments}
									columns={attachmentColumns}
									rowKey="attachment_id"
									size="small"
									pagination={false}
									scroll={{ x: 600 }}
								/>
							)}
						</Card>

						{/* Reviews Card (rendered by reviews addon) */}
						{hasAddon("reviews") &&
							isSubmitter &&
							context === "frontend" &&
							(() => {
								const AuthorReviewsPanel =
									window.simplyconf?.components?.reviews?.AuthorReviewsPanel;
								return AuthorReviewsPanel ? (
									<AuthorReviewsPanel abstractId={abstractId} />
								) : null;
							})()}
					</Col>

					{/* Right Column - Metadata & Timeline */}
					<Col xs={24} lg={8}>
						{/* Event & Session Information */}
						<Card
							title={
								<Space>
									<InfoCircleOutlined style={{ color: "#1890ff" }} />
									<span>{__("Event Information", "simplyconf")}</span>
								</Space>
							}
							style={{
								marginBottom: "24px",
								boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
								borderRadius: "8px",
							}}
						>
							<Space
								direction="vertical"
								size="middle"
								style={{ width: "100%" }}
							>
								{submission.event_id && (
									<div style={{ display: "flex", alignItems: "center" }}>
										<EnvironmentOutlined
											style={{ color: "#52c41a", marginRight: "8px" }}
										/>
										<div>
											<div
												type="secondary"
												style={{
													fontSize: "12px",
													color: "#8c8c8c",
													display: "block",
												}}
											>
												{__("Event", "simplyconf")}
											</div>
											<div style={{ fontWeight: "bold" }}>
												{(() => {
													const result = getEventName(submission.event_id);
													return typeof result === "object"
														? result.value || result.toString()
														: result;
												})()}
											</div>
										</div>
									</div>
								)}

								{submission.track_id && (
									<div style={{ display: "flex", alignItems: "center" }}>
										<TeamOutlined
											style={{ color: "#722ed1", marginRight: "8px" }}
										/>
										<div>
											<div
												type="secondary"
												style={{
													fontSize: "12px",
													color: "#8c8c8c",
													display: "block",
												}}
											>
												{getTerm("track", 1)}
											</div>
											<div style={{ fontWeight: "bold" }}>
												{(() => {
													const result = getTrackName(submission.track_id);
													return typeof result === "object"
														? result.value || result.toString()
														: result;
												})()}
											</div>
										</div>
									</div>
								)}

								{submission.session_id && (
									<div style={{ display: "flex", alignItems: "center" }}>
										<ScheduleOutlined
											style={{ color: "#fa8c16", marginRight: "8px" }}
										/>
										<div>
											<div
												type="secondary"
												style={{
													fontSize: "12px",
													color: "#8c8c8c",
													display: "block",
												}}
											>
												{getTerm("session", 1)}
											</div>
											<div style={{ fontWeight: "bold" }}>
												{(() => {
													const result = getSessionName();
													return typeof result === "object"
														? result.value || result.toString()
														: result;
												})()}
											</div>
										</div>
									</div>
								)}
							</Space>
						</Card>

						{/* Authors Information */}
						{!shouldHideAuthorInfo &&
							submission.authors &&
							submission.authors.length > 0 && (
								<Card
									title={
										<Space>
											<TeamOutlined style={{ color: "#722ed1" }} />
											<span>
												{sprintf(
													__("%s (%d)", "simplyconf"),
													getTerm("author", 2),
													submission.authors.length,
												)}
											</span>
										</Space>
									}
									style={{
										marginBottom: "24px",
										boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
										borderRadius: "8px",
									}}
								>
									<Space
										direction="vertical"
										size="middle"
										style={{ width: "100%" }}
									>
										{submission.authors.map((author, _index) => (
											<div
												key={author.email}
												style={{
													padding: "12px",
													background: "#f8f9fa",
													borderRadius: "6px",
													border: "1px solid #e8e8e8",
												}}
											>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														marginBottom: "4px",
													}}
												>
													<Avatar
														size="small"
														icon={<UserOutlined />}
														style={{
															marginRight: "8px",
															backgroundColor: "#722ed1",
														}}
													/>
													<div style={{ fontWeight: "bold" }}>
														{author.first_name} {author.last_name}
													</div>
												</div>
												<div
													style={{
														fontSize: "12px",
														color: "#8c8c8c",
														display: "block",
														marginLeft: "32px",
													}}
												>
													{author.email}
												</div>

												{/* Display custom fields */}
												{author.custom_fields &&
													author.custom_fields.length > 0 && (
														<div
															style={{ marginLeft: "32px", marginTop: "8px" }}
														>
															{author.custom_fields.map((field) => {
																// Find field definition to get label
																const fieldDef = authorCustomFields.find(
																	(f) => f.field_id === field.field_id,
																);
																if (!fieldDef || !field.value) return null;

																return (
																	<div
																		key={field.field_id}
																		style={{ marginBottom: "4px" }}
																	>
																		<div
																			style={{
																				fontSize: "12px",
																				color: "#8c8c8c",
																				marginRight: "4px",
																				display: "inline-block",
																			}}
																		>
																			{fieldDef.label}:
																		</div>
																		<div
																			style={{
																				fontSize: "12px",
																				display: "inline-block",
																			}}
																		>
																			{(() => {
																				// Handle array values (checkboxes, multi-select)
																				if (Array.isArray(field.value)) {
																					// Check if it's an array of objects with field_id/value structure
																					if (
																						field.value.length > 0 &&
																						typeof field.value[0] ===
																							"object" &&
																						field.value[0].value !== undefined
																					) {
																						// Extract values from array of objects
																						const result = field.value
																							.map((item) => item.value || "")
																							.filter(
																								(val) => val.trim() !== "",
																							)
																							.join(", ");
																						return result;
																					}
																					// Regular array of strings
																					const result = field.value.join(", ");
																					return result;
																				}
																				// Handle boolean values
																				if (typeof field.value === "boolean") {
																					const result = field.value
																						? __("Yes", "simplyconf")
																						: __("No", "simplyconf");
																					return result;
																				}
																				// Handle object values
																				if (
																					typeof field.value === "object" &&
																					field.value !== null
																				) {
																					// Try different ways to extract value from object
																					if (
																						field.value.value !== undefined &&
																						typeof field.value.value ===
																							"object" &&
																						field.value.value !== null
																					) {
																						// Handle nested object structure like {field_id: "1", value: {field_id: "1", value: "Google"}}
																						if (
																							field.value.value.value !==
																							undefined
																						) {
																							return String(
																								field.value.value.value,
																							);
																						}
																						// If still an object, stringify it
																						return JSON.stringify(
																							field.value.value,
																						);
																					}
																					if (field.value.value !== undefined) {
																						return String(field.value.value);
																					}
																					if (field.value.label !== undefined) {
																						return String(field.value.label);
																					}
																					if (field.value.name !== undefined) {
																						return String(field.value.name);
																					}
																					// Last resort: stringify the object
																					return JSON.stringify(field.value);
																				}
																				// Handle other values (string, number)
																				return (
																					field.value?.toString() ||
																					__("N/A", "simplyconf")
																				);
																			})()}
																		</div>
																	</div>
																);
															})}
														</div>
													)}

												<Space
													size="small"
													style={{ marginLeft: "32px", marginTop: "4px" }}
												>
													{(author.is_corresponding === 1 ||
														author.is_corresponding === "1" ||
														author.is_corresponding === true) && (
														<Tag color="gold" style={{ fontSize: "11px" }}>
															Corresponding
														</Tag>
													)}
													{(author.is_presenter === 1 ||
														author.is_presenter === "1" ||
														author.is_presenter === true) && (
														<Tag color="blue" style={{ fontSize: "11px" }}>
															Presenter
														</Tag>
													)}
												</Space>
											</div>
										))}
									</Space>
								</Card>
							)}

						{/* Timeline Card */}
						<Card
							title={
								<Space>
									<ClockCircleOutlined style={{ color: "#faad14" }} />
									<span>{__("Timeline", "simplyconf")}</span>
								</Space>
							}
							style={{
								marginBottom: "24px",
								boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
								borderRadius: "8px",
							}}
						>
							<Timeline
								items={[
									{
										dot: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
										color: "green",
										children: (
											<>
												<div style={{ fontWeight: "bold" }}>
													{sprintf(
														__("%s Created", "simplyconf"),
														getTerm("abstract", 1),
													)}
												</div>
												<br />
												<div style={{ color: "#8c8c8c" }}>
													{submission.created
														? new Date(submission.created).toLocaleDateString(
																"en-US",
																{
																	year: "numeric",
																	month: "long",
																	day: "numeric",
																	hour: "2-digit",
																	minute: "2-digit",
																},
															)
														: __("Not available", "simplyconf")}
												</div>
											</>
										),
									},
									...(submission.modified &&
									submission.modified !== submission.created
										? [
												{
													dot: <EditOutlined style={{ color: "#1890ff" }} />,
													color: "blue",
													children: (
														<>
															<div style={{ fontWeight: "bold" }}>
																{__("Last Modified", "simplyconf")}
															</div>
															<br />
															<div style={{ color: "#8c8c8c" }}>
																{new Date(
																	submission.modified,
																).toLocaleDateString("en-US", {
																	year: "numeric",
																	month: "long",
																	day: "numeric",
																	hour: "2-digit",
																	minute: "2-digit",
																})}
															</div>
														</>
													),
												},
											]
										: []),
									{
										color: "gray",
										children: (
											<div style={{ color: "#8c8c8c" }}>
												{__("Current Status:", "simplyconf")}{" "}
												<strong>
													{getStatusTag(submission.status, submission)}
												</strong>
											</div>
										),
									},
								]}
							/>
						</Card>

						{/* Statistics Card */}
						<Card className="simplyconf-content-card">
							<Row gutter={16}>
								<Col span={12}>
									<Statistic
										title={<strong>{__("Word Count", "simplyconf")}</strong>}
										value={
											submission.description
												? submission.description.split(/\s+/).length
												: 0
										}
										prefix={<FileTextOutlined />}
										valueStyle={{ fontSize: "16px" }}
									/>
								</Col>
								{!shouldHideAuthorInfo && (
									<Col span={12}>
										<Statistic
											title={
												<strong>{__("Submitted By", "simplyconf")}</strong>
											}
											value={
												authorInfo
													? authorInfo.display_name ||
														authorInfo.username ||
														__("Unknown User", "simplyconf")
													: __("Loading...", "simplyconf")
											}
											valueStyle={{ fontSize: "16px" }}
										/>
									</Col>
								)}
							</Row>
						</Card>
					</Col>
				</Row>
			</div>
		</div>
	);
};

SubmissionView.propTypes = {
	abstractId: PropTypes.number.isRequired,
	showNavigation: PropTypes.bool,
	showActions: PropTypes.bool,
	onBack: PropTypes.func,
	context: PropTypes.oneOf(["frontend", "admin"]),
	showHeader: PropTypes.bool,
	submissionData: PropTypes.object,
};

export default SubmissionView;
