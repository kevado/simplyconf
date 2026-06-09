import {
	DeleteOutlined,
	DownloadOutlined,
	FileOutlined,
	FilterOutlined,
	MoreOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import AttachmentService from "@services/attachments";
import FilePreview from "@shared/attachments/FilePreview";
import {
	bulkDeleteAttachments,
	clearError,
	clearFilters,
	deleteAttachment,
	downloadAttachment,
	fetchAttachments,
	selectAttachmentFilters,
	selectAttachmentsError,
	selectAttachmentsErrorMessage,
	selectAttachmentsLoading,
	selectFilteredAttachments,
	selectSelectedAttachmentIds,
	setFileTypeFilter,
	setSearchText,
	setSelectedAttachments,
} from "@state/attachmentSlice";
import { showError, showSuccess } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Col,
	Dropdown,
	Input,
	Modal,
	Row,
	Select,
	Space,
	Table,
	Tag,
	Typography,
	theme,
} from "antd";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sprintf } from "sprintf-js";

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

const FileManager = ({ className = "" }) => {
	const { eventId } = useSelector((state) => ({
		eventId: state.events.globalId,
	}));
	const { token } = theme.useToken();
	const { getTerm } = useTerminology();
	const dispatch = useDispatch();
	const [previewFile, setPreviewFile] = useState(null);

	// Redux state
	const filteredAttachments = useSelector(selectFilteredAttachments);
	const loading = useSelector(selectAttachmentsLoading);
	const error = useSelector(selectAttachmentsError);
	const errorMessage = useSelector(selectAttachmentsErrorMessage);
	const filters = useSelector(selectAttachmentFilters);
	const selectedRowKeys = useSelector(selectSelectedAttachmentIds);

	useEffect(() => {
		if (eventId) {
			dispatch(fetchAttachments({ eventId }));
		}
	}, [dispatch, eventId]);

	// Clear any errors when component mounts
	useEffect(() => {
		dispatch(clearError());
	}, [dispatch]);

	const handleDownload = async (attachment) => {
		try {
			const result = await dispatch(
				downloadAttachment(attachment.attachment_id),
			).unwrap();

			// Trigger browser download from the response
			const blob = new Blob([result.response.data], {
				type: attachment.file_type,
			});
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

	const handleBulkDelete = async () => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: __("Delete Files", "simplyconf"),
			content: sprintf(
				__("Are you sure you want to delete %d selected files?", "simplyconf"),
				selectedRowKeys.length,
			),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					await dispatch(bulkDeleteAttachments(selectedRowKeys)).unwrap();
					showSuccess(
						sprintf(
							__("%d files deleted successfully", "simplyconf"),
							selectedRowKeys.length,
						),
					);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showError(
						__(
							"Some files could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	const handleRefresh = () => {
		if (eventId) {
			dispatch(fetchAttachments({ eventId }));
		}
	};

	const getFileTypeIcon = (fileType) => {
		const icons = {
			"application/pdf": "📄",
			"application/msword": "📝",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				"📝",
			"application/vnd.ms-excel": "📊",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
			"image/jpeg": "🖼️",
			"image/png": "🖼️",
			"image/gif": "🖼️",
			"video/mp4": "🎥",
			"video/avi": "🎥",
		};
		return icons[fileType] || "📎";
	};

	const _getStatusTag = (attachment) => {
		const colors = {
			public: "green",
			private: "blue",
			reviewers_only: "orange",
			admin_only: "red",
		};
		return (
			<Tag color={colors[attachment.access_level]}>
				{attachment.access_level.replace("_", " ")}
			</Tag>
		);
	};

	const columns = [
		{
			title: __("ID", "simplyconf"),
			dataIndex: "attachment_id",
			key: "attachment_id",
			width: 80,
			sorter: (a, b) => a.attachment_id - b.attachment_id,
		},
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
						<Button
							type="link"
							onClick={() => handleDownload(record)}
							className="simplyconf-table-link"
						>
							{text}
						</Button>
						<Text type="secondary" style={{ fontSize: "12px" }}>
							{AttachmentService.formatFileSize(record.file_size)}
						</Text>
					</div>
				</Space>
			),
			sorter: (a, b) => a.file_name.localeCompare(b.file_name),
		},
		{
			title: __("Entity", "simplyconf"),
			dataIndex: "entity_type",
			key: "entity_type",
			render: (text, record) => (
				<div>
					<div>{text}</div>
					<Text type="secondary" style={{ fontSize: "12px" }}>
						{sprintf(__("ID: %s", "simplyconf"), record.entity_id)}
					</Text>
				</div>
			),
			filters: [
				{ text: getTerm("abstract", 1), value: "abstract" },
				{ text: getTerm("review", 1), value: "review" },
				{ text: getTerm("user", 1), value: "user" },
				{ text: __("Event", "simplyconf"), value: "event" },
			],
			onFilter: (value, record) => record.entity_type === value,
		},
		{
			title: __("Uploaded", "simplyconf"),
			dataIndex: "created",
			key: "created",
			render: (date) => new Date(date).toLocaleDateString(),
			sorter: (a, b) => new Date(a.created) - new Date(b.created),
		},
		{
			title: __("Downloads", "simplyconf"),
			dataIndex: "download_count",
			key: "download_count",
			sorter: (a, b) => a.download_count - b.download_count,
		},
		{
			title: __("Uploaded By", "simplyconf"),
			dataIndex: "uploader",
			key: "uploader",
			render: (uploader) => {
				if (!uploader) return __("Unknown User", "simplyconf");
				return (
					<div>
						<div style={{ fontWeight: "bold" }}>{uploader.display_name}</div>
						<Text type="secondary" style={{ fontSize: "12px" }}>
							{uploader.email}
						</Text>
					</div>
				);
			},
		},
		{
			title: __("Actions", "simplyconf"),
			key: "actions",
			fixed: "right",
			align: "center",
			render: (_, record) => (
				<Dropdown
					menu={{
						items: [
							{
								key: "download",
								label: __("Download", "simplyconf"),
								icon: <DownloadOutlined />,
								onClick: () => handleDownload(record),
							},
							{
								key: "delete",
								label: __("Delete", "simplyconf"),
								icon: <DeleteOutlined />,
								danger: true,
								onClick: () => {
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
								},
							},
						],
					}}
					placement="left"
				>
					<Button type="text" icon={<SettingOutlined />} />
				</Dropdown>
			),
		},
	];

	const rowSelection = {
		selectedRowKeys,
		onChange: (selectedKeys) => dispatch(setSelectedAttachments(selectedKeys)),
	};

	if (error) {
		return (
			<div
				style={{
					background: "#fff",
					borderRadius: "8px",
					padding: "40px",
					textAlign: "center",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
				}}
			>
				<Typography.Text type="danger">{errorMessage}</Typography.Text>
			</div>
		);
	}

	return (
		<div className={`admin-file-manager ${className}`}>
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Space>
							<FileOutlined style={{ color: "#fff", fontSize: "18px" }} />
							<Typography.Title level={4} style={{ margin: 0, color: "#fff" }}>
								{__("File Manager", "simplyconf")}
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
								{sprintf(
									__("%d files", "simplyconf"),
									filteredAttachments.length,
								)}
							</Typography.Text>
						</Space>
					</Col>
					<Col>
						<Space>
							{selectedRowKeys.length > 0 && (
								<Dropdown
									menu={{
										items: [
											{
												key: "bulk_delete",
												label: __("Delete Selected", "simplyconf"),
												icon: <DeleteOutlined />,
												danger: true,
												onClick: handleBulkDelete,
											},
										],
									}}
									placement="bottomRight"
								>
									<Button className="simplyconf-bulk-actions-btn">
										{__(
											"Bulk Actions ({selectedRowKeys.length})",
											"simplyconf",
										).replace(
											"{selectedRowKeys.length}",
											selectedRowKeys.length,
										)}{" "}
										<MoreOutlined />
									</Button>
								</Dropdown>
							)}
							<Search
								placeholder={__("Search files...", "simplyconf")}
								value={filters.searchText}
								onChange={(e) => dispatch(setSearchText(e.target.value))}
								className="simplyconf-admin-search"
								allowClear
							/>

							<Select
								placeholder={__("File Type", "simplyconf")}
								value={filters.fileType}
								onChange={(value) => dispatch(setFileTypeFilter(value))}
								style={{ width: 120 }}
								className="header-select"
							>
								<Option value="all">{__("All Types", "simplyconf")}</Option>
								<Option value="document">
									{__("Documents", "simplyconf")}
								</Option>
								<Option value="image">{__("Images", "simplyconf")}</Option>
								<Option value="video">{__("Videos", "simplyconf")}</Option>
								<Option value="pdf">{__("PDF", "simplyconf")}</Option>
							</Select>

							<Button
								icon={<FilterOutlined />}
								onClick={() => dispatch(clearFilters())}
								type="text"
								className="simplyconf-secondary-action-btn"
								title={__("Clear Filters", "simplyconf")}
							/>

							<Button
								icon={<ReloadOutlined />}
								onClick={handleRefresh}
								type="text"
								className="simplyconf-secondary-action-btn"
								title={__("Refresh", "simplyconf")}
							/>
						</Space>
					</Col>
				</Row>
			</div>

			<Table
				dataSource={filteredAttachments}
				columns={columns}
				rowKey="attachment_id"
				rowSelection={rowSelection}
				loading={loading}
				pagination={getTablePagination({
					total: filteredAttachments.length,
					entityName: __("files", "simplyconf"),
				})}
				scroll={{ x: "max-content" }}
				style={{
					background: "#fff",
					borderRadius: "8px",
					overflow: "hidden",
					boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
				}}
				rowClassName={(_record, index) =>
					index % 2 === 0 ? "table-row-light" : "table-row-dark"
				}
			/>

			{previewFile && (
				<FilePreview
					attachment={previewFile}
					onClose={() => setPreviewFile(null)}
				/>
			)}
		</div>
	);
};

FileManager.propTypes = {
	className: PropTypes.string,
};

export default FileManager;
