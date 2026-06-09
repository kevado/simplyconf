import {
	DeleteOutlined,
	DownloadOutlined,
	EyeOutlined,
	FileExcelOutlined,
	FileOutlined,
	FilePdfOutlined,
	FileWordOutlined,
} from "@ant-design/icons";
import AttachmentService from "@services/attachments";
import { __ } from "@wordpress/i18n";
import { Button, Image, Space, Typography } from "antd";
import PropTypes from "prop-types";

const { Text } = Typography;

const IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
];

const getFileIcon = (fileType) => {
	if (!fileType) return <FileOutlined />;
	if (fileType.includes("pdf"))
		return <FilePdfOutlined style={{ color: "#ff4d4f" }} />;
	if (fileType.includes("word") || fileType.includes(".doc"))
		return <FileWordOutlined style={{ color: "#1890ff" }} />;
	if (fileType.includes("excel") || fileType.includes("spreadsheet"))
		return <FileExcelOutlined style={{ color: "#52c41a" }} />;
	return <FileOutlined style={{ color: "#1890ff" }} />;
};

/**
 * Renders an attachment preview — inline image for images, file info card for documents.
 */
const AttachmentPreview = ({
	attachment,
	onDownload,
	onRemove,
	disabled = false,
}) => {
	const isImage = IMAGE_TYPES.includes(attachment.file_type);
	const fileSize = AttachmentService.formatFileSize(
		Number.parseInt(attachment.file_size, 10) || 0,
	);

	if (isImage) {
		const imageUrl = attachment.file_url || attachment.guid;

		return (
			<div
				style={{
					border: "1px solid #d9d9d9",
					borderRadius: "6px",
					overflow: "hidden",
					background: "#fafafa",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						padding: "8px",
						background: "#f5f5f5",
						minHeight: 80,
					}}
				>
					<Image
						src={imageUrl}
						alt={attachment.file_name}
						style={{
							maxHeight: 200,
							objectFit: "contain",
							borderRadius: "4px",
						}}
						preview={{
							mask: (
								<Space>
									<EyeOutlined /> {__("Preview", "simplyconf")}
								</Space>
							),
						}}
					/>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "6px 12px",
						borderTop: "1px solid #f0f0f0",
					}}
				>
					<Text
						type="secondary"
						style={{ fontSize: 12 }}
						ellipsis={{ tooltip: attachment.file_name }}
					>
						{attachment.file_name} ({fileSize})
					</Text>
					<Space size={4}>
						{onDownload && (
							<Button
								type="text"
								icon={<DownloadOutlined />}
								onClick={onDownload}
								size="small"
							/>
						)}
						{!disabled && onRemove && (
							<Button
								type="text"
								danger
								icon={<DeleteOutlined />}
								onClick={onRemove}
								size="small"
							/>
						)}
					</Space>
				</div>
			</div>
		);
	}

	// Non-image file card
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "8px 12px",
				border: "1px solid #d9d9d9",
				borderRadius: "6px",
				background: "#fafafa",
			}}
		>
			<Space>
				{getFileIcon(attachment.file_type)}
				<div>
					<div>
						{onDownload ? (
							<button
								type="button"
								onClick={onDownload}
								style={{
									cursor: "pointer",
									background: "none",
									border: "none",
									padding: 0,
									color: "#1890ff",
									fontSize: "inherit",
								}}
							>
								{attachment.file_name}
							</button>
						) : (
							<Text>{attachment.file_name}</Text>
						)}
					</div>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{fileSize}
					</Text>
				</div>
			</Space>
			{!disabled && onRemove && (
				<Button
					type="text"
					danger
					icon={<DeleteOutlined />}
					onClick={onRemove}
					size="small"
				>
					{__("Remove", "simplyconf")}
				</Button>
			)}
		</div>
	);
};

AttachmentPreview.propTypes = {
	attachment: PropTypes.shape({
		file_name: PropTypes.string.isRequired,
		file_type: PropTypes.string,
		file_size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		file_url: PropTypes.string,
		guid: PropTypes.string,
	}).isRequired,
	onDownload: PropTypes.func,
	onRemove: PropTypes.func,
	disabled: PropTypes.bool,
};

export default AttachmentPreview;
