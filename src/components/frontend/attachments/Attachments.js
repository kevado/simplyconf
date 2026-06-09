import {
	DeleteOutlined,
	DownloadOutlined,
	EyeOutlined,
	FileOutlined,
	PlusOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import AttachmentService from "@services/attachments";
import FilePreview from "@shared/attachments/FilePreview";
import { getAbstracts } from "@state/abstractSlice";
import {
	deleteAttachment,
	fetchAttachments,
	selectAttachmentsError,
	selectAttachmentsErrorMessage,
	selectAttachmentsLoading,
	selectFilteredAttachments,
} from "@state/attachmentSlice";
import { showError, showSuccess } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Empty,
	Modal,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { sprintf } from "sprintf-js";

const { Title, Text } = Typography;

const UserAttachments = () => {
	const dispatch = useDispatch();
	const [previewFile, setPreviewFile] = useState(null);

	const { getTerm } = useTerminology();

	// Redux state
	const user = useSelector((state) => state.auth.user);
	const abstracts = useSelector((state) => {
		const abstractsData = state.abstracts.abstracts;
		// Ensure abstracts is always an array
		if (Array.isArray(abstractsData)) {
			return abstractsData;
		}
		if (abstractsData && typeof abstractsData === "object") {
			// If abstracts is an object (like normalized state), convert to array
			return Object.values(abstractsData);
		}
		return [];
	});
	const attachments = useSelector(selectFilteredAttachments);
	const loading = useSelector(selectAttachmentsLoading);
	const error = useSelector(selectAttachmentsError);
	const errorMessage = useSelector(selectAttachmentsErrorMessage);

	// Listen for successful uploads to refresh attachments
	const _attachmentState = useSelector((state) => state.attachments);
	const previousAttachmentCount = React.useRef(0);

	const handleRefresh = React.useCallback(() => {
		if (user?.ID && Array.isArray(abstracts) && abstracts.length > 0) {
			console.log("Manually refreshing attachments");
			abstracts.forEach((abstract) => {
				if (abstract.submit_by === user.ID) {
					dispatch(
						fetchAttachments({
							entityType: "abstract",
							entityId: abstract.abstract_id,
							eventId: abstract.event_id,
						}),
					);
				}
			});
			showSuccess(__("Attachments refreshed", "simplyconf"));
		}
	}, [user?.ID, abstracts, dispatch]);

	useEffect(() => {
		const currentCount = attachments.length;
		if (currentCount > previousAttachmentCount.current) {
			console.log("New attachment detected, refreshing...");
			// A new attachment was added, refresh all user attachments
			handleRefresh();
		}
		previousAttachmentCount.current = currentCount;
	}, [attachments.length, handleRefresh]);

	// Get user's abstracts on component mount
	useEffect(() => {
		if (user?.ID) {
			dispatch(getAbstracts()); // Will use getEventId() fallback for frontend
		}
	}, [dispatch, user]);

	// Fetch attachments for user's abstracts
	useEffect(() => {
		if (user?.ID && Array.isArray(abstracts) && abstracts.length > 0) {
			console.log("Fetching attachments for user abstracts:", abstracts);
			// Fetch attachments for all user's abstracts
			abstracts.forEach((abstract) => {
				if (abstract.submit_by === user.ID) {
					console.log(
						"Fetching attachments for abstract:",
						abstract.abstract_id,
					);
					dispatch(
						fetchAttachments({
							entityType: "abstract",
							entityId: abstract.abstract_id,
							eventId: abstract.event_id,
						}),
					);
				}
			});
		}
	}, [dispatch, user, abstracts]);

	// Force refresh when component becomes visible (to catch new uploads)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (
				!document.hidden &&
				user?.ID &&
				Array.isArray(abstracts) &&
				abstracts.length > 0
			) {
				console.log("Page became visible, refreshing attachments");
				abstracts.forEach((abstract) => {
					if (abstract.submit_by === user.ID) {
						dispatch(
							fetchAttachments({
								entityType: "abstract",
								entityId: abstract.abstract_id,
								eventId: abstract.event_id,
							}),
						);
					}
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [dispatch, user, abstracts]);

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

	const handleDelete = async (attachmentId) => {
		try {
			await dispatch(deleteAttachment(attachmentId)).unwrap();
			showSuccess(__("File deleted successfully", "simplyconf"));
		} catch (error) {
			console.error("Delete failed:", error);
			showError(__("Delete failed. Please try again.", "simplyconf"));
		}
	};

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

	const getPurposeTag = (purpose) => {
		const colors = {
			abstract_pdf: "purple",
			supporting_doc: "cyan",
			presentation: "blue",
			poster: "green",
			cv: "orange",
			other: "default",
		};
		return <Tag color={colors[purpose]}>{purpose.replace("_", " ")}</Tag>;
	};

	const getAbstractTitle = (entityId) => {
		if (!Array.isArray(abstracts))
			return `${getTerm("abstract", 1)} ${entityId}`;
		const abstract = abstracts.find((a) => a.abstract_id === entityId);
		return abstract ? abstract.title : `${getTerm("abstract", 1)} ${entityId}`;
	};

	// Filter attachments to only show user's files with safety checks
	const userAttachments = Array.isArray(attachments)
		? attachments.filter((attachment) => {
				if (!Array.isArray(abstracts)) return false;
				const abstract = abstracts.find(
					(a) => a.abstract_id === attachment.entity_id,
				);
				return abstract && abstract.submit_by === user?.ID;
			})
		: [];

	// Debug logging
	console.log("Current state:", {
		user: user?.ID,
		abstracts: abstracts.length,
		attachments: attachments.length,
		userAttachments: userAttachments.length,
		loading,
		error,
		errorMessage,
	});

	const columns = [
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
						<Text type="secondary" style={{ fontSize: "12px" }}>
							{AttachmentService.formatFileSize(record.file_size)}
						</Text>
					</div>
				</Space>
			),
		},
		{
			title: getTerm("abstract", 1),
			dataIndex: "entity_id",
			key: "abstract",
			render: (entityId) => (
				<div>
					<div style={{ fontWeight: "bold" }}>{getAbstractTitle(entityId)}</div>
					<Text type="secondary" style={{ fontSize: "12px" }}>
						ID: {entityId}
					</Text>
				</div>
			),
		},
		{
			title: __("Purpose", "simplyconf"),
			dataIndex: "file_purpose",
			key: "file_purpose",
			render: (purpose) => getPurposeTag(purpose),
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
						icon={<EyeOutlined />}
						onClick={() => setPreviewFile(record)}
						title={__("Preview", "simplyconf")}
					/>
					<Button
						size="small"
						icon={<DownloadOutlined />}
						onClick={() => handleDownload(record)}
						title={__("Download", "simplyconf")}
					/>
					<Button
						size="small"
						danger
						icon={<DeleteOutlined />}
						onClick={() => {
							Modal.confirm({
								title: __("Delete File", "simplyconf"),
								content: sprintf(
									__('Are you sure you want to delete "%s"?', "simplyconf"),
									record.file_name,
								),
								okText: __("Delete", "simplyconf"),
								okType: "danger",
								onOk: () => handleDelete(record.attachment_id),
							});
						}}
						title={__("Delete", "simplyconf")}
					/>
				</Space>
			),
		},
	];

	if (error) {
		return (
			<Card>
				<Text type="danger">{errorMessage}</Text>
			</Card>
		);
	}

	return (
		<div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
			<div
				style={{
					marginBottom: 24,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div>
					<Title level={2}>
						<FileOutlined style={{ marginRight: 8 }} />
						{__("My Attachments", "simplyconf")}
					</Title>
					<Text type="secondary">
						{sprintf(
							__(
								"Manage files and attachments for your %s submissions",
								"simplyconf",
							),
							getTerm("abstract", 2).toLowerCase(),
						)}
					</Text>
				</div>
				<Tooltip title={__("Refresh attachments list", "simplyconf")}>
					<Button
						icon={<ReloadOutlined />}
						onClick={handleRefresh}
						loading={loading}
					>
						{__("Refresh", "simplyconf")}
					</Button>
				</Tooltip>
			</div>

			<Card>
				{userAttachments.length === 0 ? (
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							<span>
								{__("No attachments found.", "simplyconf")} <br />
								{sprintf(
									__(
										"Upload files when creating or editing your %s.",
										"simplyconf",
									),
									getTerm("abstract", 2).toLowerCase(),
								)}
							</span>
						}
					>
						<Link to="/submissions">
							<Button type="primary" icon={<PlusOutlined />}>
								{__("Go to Submissions", "simplyconf")}
							</Button>
						</Link>
					</Empty>
				) : (
					<Table
						dataSource={userAttachments}
						columns={columns}
						rowKey="attachment_id"
						loading={loading}
						pagination={getTablePagination({
							total: userAttachments.length,
							entityName: __("files", "simplyconf"),
						})}
					/>
				)}
			</Card>

			{previewFile && (
				<FilePreview
					attachment={previewFile}
					onClose={() => setPreviewFile(null)}
				/>
			)}
		</div>
	);
};

export default UserAttachments;
