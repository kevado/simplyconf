import {
	DeleteOutlined,
	EditOutlined,
	FilePdfOutlined,
	ReadOutlined,
	ReloadOutlined,
	SettingOutlined,
	StarOutlined,
	UserSwitchOutlined,
} from "@ant-design/icons";
import { useTerminology } from "@hooks/useTerminology";
import CustomFieldFileValue from "@shared/customFields/CustomFieldFileValue";
import { __ } from "@wordpress/i18n";
import { Button, Dropdown, Popconfirm, Space, Typography, theme } from "antd";
import { useMemo } from "react";

/**
 * Custom hook that builds the abstract table columns based on visibility config and data.
 *
 * @param {object} options
 * @param {Array}  options.customFieldColumns - Custom field column configs with visibility
 * @param {object} options.visibleFixedColumns - Map of fixed column keys to boolean
 * @param {Array}  options.tracks             - Array of track objects
 * @param {Array}  options.statuses           - Array of status objects
 * @param {boolean} options.statusesLoading   - Whether statuses are still loading
 * @param {Function} options.launchView       - Callback to view an abstract
 * @param {Function} options.launchEdit       - Callback to edit an abstract
 * @param {Function} options.launchReviews    - Callback to open reviews for an abstract
 * @param {Function} options.launchAssignment - Callback to open reviewer assignment
 * @param {Function} options.launchStatusChange - Callback to open status change modal
 * @param {Function} options.handleExportPDF  - Callback to export PDF
 * @param {Function} options.onDelete         - Callback to delete an abstract
 * @returns {Array} Ant Design table column definitions
 */
export function useAbstractColumns({
	customFieldColumns,
	visibleFixedColumns,
	tracks,
	statuses,
	statusesLoading,
	launchView,
	launchEdit,
	launchReviews,
	launchAssignment,
	launchStatusChange,
	handleExportPDF,
	onDelete,
}) {
	const { token } = theme.useToken();
	const { getTerm } = useTerminology();
	return useMemo(() => {
		const columns = [
			{
				title: __("ID", "simplyconf"),
				dataIndex: "abstract_id",
				key: "id",
				width: 80,
				sorter: (a, b) => a.abstract_id - b.abstract_id,
				defaultSortOrder: "descend",
			},
			{
				title: __("Title", "simplyconf"),
				dataIndex: "title",
				key: "title",
				sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
				render: (text, { abstract_id }) => (
					<Button
						type="link"
						onClick={() => launchView(abstract_id)}
						className="simplyconf-table-link"
						style={{ maxWidth: 300 }}
					>
						{text}
					</Button>
				),
			},
		];

		// Add Track column if visible
		if (visibleFixedColumns.track) {
			columns.push({
				title: getTerm("track", 1),
				dataIndex: "track_id",
				key: "track",
				width: 120,
				sorter: (a, b) => {
					const aTrack =
						tracks.find((t) => t.track_id === a.track_id)?.name || "";
					const bTrack =
						tracks.find((t) => t.track_id === b.track_id)?.name || "";
					return aTrack.localeCompare(bTrack);
				},
				render: (trackId) => {
					const track = tracks.find((t) => t.track_id === trackId);
					return track ? (
						<Typography.Text>{track.name}</Typography.Text>
					) : (
						<Typography.Text type="secondary">
							{__("N/A", "simplyconf")}
						</Typography.Text>
					);
				},
			});
		}

		// Add custom field columns that are visible
		customFieldColumns.forEach((field) => {
			if (field.visible) {
				columns.push({
					title: field.label,
					dataIndex: field.name,
					key: field.name,
					sorter: (a, b) => {
						const aValue = a[field.name] || "";
						const bValue = b[field.name] || "";
						const aStr = Array.isArray(aValue)
							? aValue.join(", ")
							: String(aValue);
						const bStr = Array.isArray(bValue)
							? bValue.join(", ")
							: String(bValue);
						return aStr.localeCompare(bStr);
					},
					render: (text) => {
						if (field.type === "file_upload") {
							return <CustomFieldFileValue value={text} />;
						}
						let displayValue = text;
						if (Array.isArray(text)) {
							if (
								text.length > 0 &&
								typeof text[0] === "object" &&
								text[0].value !== undefined
							) {
								displayValue = text
									.map((item) => item.value || "")
									.filter((val) => val.trim() !== "")
									.join(", ");
							} else {
								displayValue = text.join(", ");
							}
						}
						return (
							<div
								style={{
									maxWidth: 150,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{displayValue || __("N/A", "simplyconf")}
							</div>
						);
					},
				});
			}
		});

		// Add Reviewers column if visible
		if (visibleFixedColumns.reviewers) {
			columns.push({
				title: getTerm("reviewer", 2),
				dataIndex: "reviewer_count",
				key: "reviewers",
				width: 200,
				sorter: (a, b) => (a.reviewer_count || 0) - (b.reviewer_count || 0),
				render: (count, record) => {
					const reviewerCount = Number.parseInt(count, 10) || 0;
					let reviewerNames = "";
					if (record.reviewer_names) {
						if (Array.isArray(record.reviewer_names)) {
							reviewerNames = record.reviewer_names
								.map((item) => item.value || "")
								.filter((name) => name.trim() !== "")
								.join(", ");
						} else {
							reviewerNames = record.reviewer_names;
						}
					}

					if (reviewerCount === 0) {
						return (
							<Button
								type="link"
								size="small"
								icon={<UserSwitchOutlined />}
								onClick={() => launchAssignment(record.abstract_id)}
								style={{ padding: 0, color: token.colorPrimary }}
							>
								{__("Add Reviewers", "simplyconf")}
							</Button>
						);
					}

					const names = reviewerNames.split(", ");
					const displayText =
						names.length > 2
							? `${names.slice(0, 2).join(", ")}...`
							: reviewerNames;

					return (
						<Space direction="vertical" size={0} style={{ width: "100%" }}>
							<Typography.Text
								ellipsis={{ tooltip: reviewerNames }}
								style={{ maxWidth: 150 }}
							>
								{displayText}
							</Typography.Text>
							<Button
								type="link"
								size="small"
								onClick={() => launchAssignment(record.abstract_id)}
								style={{
									padding: 0,
									height: "auto",
									color: token.colorPrimary,
								}}
							>
								{__("Manage ({reviewerCount})", "simplyconf").replace(
									"{reviewerCount}",
									reviewerCount,
								)}
							</Button>
						</Space>
					);
				},
			});
		}

		// Add Submitted By column if visible
		if (visibleFixedColumns.submitted_by) {
			columns.push({
				title: __("Submitted By", "simplyconf"),
				dataIndex: "submitted_by_name",
				key: "submitted_by",
				width: 150,
				sorter: (a, b) =>
					(a.submitted_by_name || "").localeCompare(b.submitted_by_name || ""),
				render: (name, record) => {
					if (!name) {
						return (
							<Typography.Text type="secondary">
								{__("Unknown", "simplyconf")}
							</Typography.Text>
						);
					}
					return (
						<Typography.Text ellipsis={{ tooltip: record.submitted_by_email }}>
							{name}
						</Typography.Text>
					);
				},
			});
		}

		// Add Status column if visible
		if (visibleFixedColumns.status) {
			columns.push({
				title: __("Status", "simplyconf"),
				dataIndex: "status",
				key: "status",
				width: 100,
				sorter: (a, b) => (a.status || 0) - (b.status || 0),
				render: (status, record) => {
					const getStatusType = (color) => {
						if (color === "#dc3545" || color === "red") return "danger";
						if (color === "#28a745" || color === "green") return "success";
						if (color === "#ffc107" || color === "yellow") return "warning";
						if (color === "#6c757d" || color === "gray") return "secondary";
						return undefined;
					};

					if (record?.status_name) {
						return (
							<Typography.Text
								type={getStatusType(record.status_color || "blue")}
							>
								{record.status_label || record.status_name}
							</Typography.Text>
						);
					}

					if (statusesLoading && (!statuses || statuses.length === 0)) {
						return (
							<Typography.Text type="secondary">
								{__("Loading...", "simplyconf")}
							</Typography.Text>
						);
					}

					if (
						status &&
						statuses &&
						Array.isArray(statuses) &&
						statuses.length > 0
					) {
						const statusObj = statuses.find(
							(s) =>
								Number.parseInt(s.status_id, 10) ===
								Number.parseInt(status, 10),
						);
						if (statusObj) {
							return (
								<Typography.Text type={getStatusType(statusObj.color)}>
									{statusObj.label || statusObj.name}
								</Typography.Text>
							);
						}
					}

					return (
						<Typography.Text type="secondary">
							{status
								? `${__("Unknown", "simplyconf")} (ID: ${status})`
								: __("No Status", "simplyconf")}
						</Typography.Text>
					);
				},
			});
		}

		// Add Created column if visible
		if (visibleFixedColumns.created) {
			columns.push({
				title: __("Created", "simplyconf"),
				dataIndex: "created",
				key: "created",
				width: 150,
				sorter: (a, b) => new Date(a.created || 0) - new Date(b.created || 0),
				render: (created) => {
					if (!created) return __("N/A", "simplyconf");
					const date = new Date(created);
					return (
						<div>
							<div>{date.toLocaleDateString()}</div>
							<Typography.Text type="secondary">
								{date.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Typography.Text>
						</div>
					);
				},
			});
		}

		// Add Modified column if visible
		if (visibleFixedColumns.modified) {
			columns.push({
				title: __("Modified", "simplyconf"),
				dataIndex: "modified",
				key: "modified",
				width: 150,
				sorter: (a, b) => new Date(a.modified || 0) - new Date(b.modified || 0),
				render: (modified) => {
					if (!modified) return __("N/A", "simplyconf");
					const date = new Date(modified);
					return (
						<div>
							<div>{date.toLocaleDateString()}</div>
							<Typography.Text type="secondary">
								{date.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Typography.Text>
						</div>
					);
				},
			});
		}

		// Actions column - always visible
		columns.push({
			title: __("Action", "simplyconf"),
			key: "action",
			fixed: "right",
			render: (_text, abs) => (
				<Space direction="vertical" id={`abs-${abs.abstract_id}-action`}>
					<Dropdown
						menu={{
							items: [
								{
									key: "1_view",
									label: (
										<span data-testid="view-abstract-btn">
											{__("View", "simplyconf")}
										</span>
									),
									icon: <ReadOutlined />,
									onClick: () => launchView(abs.abstract_id),
								},
								{
									key: "2_edit",
									label: (
										<span data-testid="edit-abstract-btn">
											{__("Edit", "simplyconf")}
										</span>
									),
									icon: <EditOutlined />,
									onClick: () => launchEdit(abs.abstract_id),
								},
								{
									key: "3_assign",
									label: __("Assign", "simplyconf"),
									icon: <UserSwitchOutlined />,
									onClick: () => launchAssignment(abs.abstract_id),
								},
								{
									key: "4_status",
									label: __("Change Status", "simplyconf"),
									icon: <ReloadOutlined />,
									onClick: () => launchStatusChange(abs),
								},
								{
									key: "5_review",
									label: getTerm("review", 2),
									icon: <StarOutlined />,
									onClick: () => launchReviews(abs.abstract_id),
								},
								{
									key: "6_export",
									label: __("Export PDF", "simplyconf"),
									icon: <FilePdfOutlined />,
									onClick: () => handleExportPDF(abs.abstract_id),
								},
								{
									key: "7_delete",
									label: (
										<Popconfirm
											placement="topRight"
											title={__("Confirmation", "simplyconf")}
											description={__(
												"Are you sure you want to delete this submission?",
												"simplyconf",
											)}
											okText={__("Delete", "simplyconf")}
											onConfirm={() => onDelete(abs.abstract_id)}
											onCancel={(e) => e.stopPropagation()}
										>
											<span
												type="text"
												data-testid="delete-abstract-btn"
												onClick={(e) => e.stopPropagation()}
											>
												{__("Delete", "simplyconf")}
											</span>
										</Popconfirm>
									),
									icon: <DeleteOutlined />,
								},
							],
						}}
						placement="left"
					>
						<Button data-testid="abstract-action-btn">
							<SettingOutlined />
						</Button>
					</Dropdown>
				</Space>
			),
		});

		return columns;
	}, [
		customFieldColumns,
		visibleFixedColumns,
		launchView,
		launchEdit,
		launchReviews,
		launchAssignment,
		launchStatusChange,
		handleExportPDF,
		onDelete,
		tracks,
		statuses,
		statusesLoading,
		getTerm,
		token.colorPrimary,
	]);
}
