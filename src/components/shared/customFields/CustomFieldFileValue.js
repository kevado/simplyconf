import { FileOutlined, LoadingOutlined } from "@ant-design/icons";
import AttachmentService from "@services/attachments";
import { selectAttachmentById } from "@state/attachmentSlice";
import { showError } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Space, Typography } from "antd";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

const { Text } = Typography;

/**
 * Compact read-only display for file_upload custom field values.
 * Resolves an attachment_id to a clickable file name that downloads the file.
 */
const CustomFieldFileValue = ({ value }) => {
	const attachmentId = value ? Number.parseInt(value, 10) : null;
	const [fileInfo, setFileInfo] = useState(null);
	const [loading, setLoading] = useState(false);
	const [fetchFailed, setFetchFailed] = useState(false);

	const storeAttachment = useSelector((state) =>
		attachmentId ? selectAttachmentById(state, attachmentId) : null,
	);

	const resolved = fileInfo || storeAttachment;

	useEffect(() => {
		if (attachmentId && !resolved && !loading && !fetchFailed) {
			setLoading(true);
			AttachmentService.getById(attachmentId)
				.then((attachment) => {
					if (attachment) {
						setFileInfo(attachment);
					} else {
						setFetchFailed(true);
					}
				})
				.catch(() => {
					setFetchFailed(true);
				})
				.finally(() => setLoading(false));
		}
	}, [attachmentId, resolved, loading, fetchFailed]);

	const handleDownload = useCallback(
		async (e) => {
			e.stopPropagation();
			if (!attachmentId) return;
			try {
				const response = await AttachmentService.downloadFile(attachmentId);
				const url = window.URL.createObjectURL(new Blob([response.data]));
				const link = document.createElement("a");
				link.href = url;
				link.setAttribute("download", resolved?.file_name || "download");
				document.body.appendChild(link);
				link.click();
				link.remove();
				window.URL.revokeObjectURL(url);
			} catch {
				showError(__("Failed to download file", "simplyconf"));
			}
		},
		[attachmentId, resolved],
	);

	if (!attachmentId) {
		return <Text type="secondary">-</Text>;
	}

	if (loading && !resolved) {
		return <LoadingOutlined style={{ fontSize: 12 }} />;
	}

	if (!resolved) {
		return <Text type="secondary">-</Text>;
	}

	const fileName = resolved.file_name || __("File", "simplyconf");

	return (
		<Space size={4}>
			<FileOutlined style={{ fontSize: 12, color: "#1890ff" }} />
			<button
				type="button"
				onClick={handleDownload}
				title={fileName}
				style={{
					maxWidth: 120,
					fontSize: 13,
					cursor: "pointer",
					background: "none",
					border: "none",
					padding: 0,
					color: "#1890ff",
					textDecoration: "none",
				}}
			>
				{fileName}
			</button>
		</Space>
	);
};

CustomFieldFileValue.propTypes = {
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CustomFieldFileValue;
