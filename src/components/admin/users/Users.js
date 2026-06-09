import { useTerminology } from "@hooks/useTerminology";
import CustomFieldFileValue from "@shared/customFields/CustomFieldFileValue";
import StyledModal from "@shared/StyledModal";
import { hasAddon } from "@utils/addons";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Button,
	Checkbox,
	Col,
	Dropdown,
	Input,
	Modal,
	Popconfirm,
	Row,
	Select,
	Space,
	Spin,
	Table,
	Tag,
	Typography,
	theme,
} from "antd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Search } = Input;

import {
	DeleteOutlined,
	EditOutlined,
	EyeOutlined,
	LayoutOutlined,
	MoreOutlined,
	PlusOutlined,
	ReadOutlined,
	ReloadOutlined,
	SettingOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import UserWizard from "@shared/users/UserWizard";
import {
	fetchCustomFields,
	selectUserFields,
	toggleCustomFieldVisibility,
} from "@state/customFieldsSlice";
import {
	fetchColumnVisibility,
	saveColumnVisibility,
} from "@state/preferenceSlice";
import {
	deleteUser,
	getEventUsers,
	setEventUserRole,
	setUserId,
	syncUsers,
} from "@state/userSlice";
import { getUUID } from "@utils";
import { showError, showSuccess } from "@utils/feedback";
import { getTablePagination } from "@utils/tableConfig";
import UserStatsCards from "./UserStatsCards";
import ViewUser from "./ViewUser";

const Users = () => {
	const [columns, setColumns] = useState(null);
	const [customFieldColumns, setCustomFieldColumns] = useState([]);
	const [data, setData] = useState([]);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isViewOpen, setIsViewOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [uuid, setUuid] = useState(null);
	const [isColumnsOpen, setIsColumnsOpen] = useState(false);
	const [isRoleOpen, setIsRoleOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [visibleFixedColumns, setVisibleFixedColumns] = useState({
		username: true,
		roles: true,
	});
	// Filter state
	const [searchText, setSearchText] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	// Bulk action state
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);
	const [isBulkRoleOpen, setIsBulkRoleOpen] = useState(false);
	const [bulkRoles, setBulkRoles] = useState([]);
	// Pagination state
	const [pageSize, setPageSize] = useState(10);
	const { token } = theme.useToken();
	const dispatch = useDispatch();

	const { eventId, users, isLoading, customFields, userId } = useSelector(
		(state) => ({
			...state.users,
			eventId: state.events.globalId,
			isLoading: state.users.isLoading,
			customFields: selectUserFields(state),
			userId: state.users.userId,
		}),
	);
	const columnVisibility = useSelector(
		(state) => state.preferences.columnVisibility.users,
	);

	const { getTerm } = useTerminology();

	// Only fetch event-specific users on mount
	useEffect(() => {
		dispatch(getEventUsers());
	}, [dispatch]);

	useEffect(() => {
		setData([]);
		setColumns(null);
		dispatch(fetchCustomFields({ event_id: eventId, usage: "user" }));
		dispatch(getEventUsers());
		dispatch(fetchColumnVisibility({ eventId, context: "users" }));
	}, [dispatch, eventId]);

	// Sync Redux column visibility to local state
	useEffect(() => {
		if (columnVisibility) {
			setVisibleFixedColumns(columnVisibility);

			// Also restore custom field visibility from user preferences if available
			if (columnVisibility.customFields && Array.isArray(customFields)) {
				const fieldColumns = customFields.map((field) => ({
					...field,
					visible:
						columnVisibility.customFields[field.field_id] !== false
							? Number.parseInt(field.show_in_admin, 10) !== 0
							: false,
				}));
				setCustomFieldColumns(fieldColumns);
			}
		}
	}, [columnVisibility, customFields]);

	// Initialize user custom field columns with visibility (only when no user preferences exist)
	useEffect(() => {
		if (
			Array.isArray(customFields) &&
			(!columnVisibility || !columnVisibility.customFields)
		) {
			if (customFields.length > 0) {
				const fieldColumns = customFields.map((field) => ({
					...field,
					visible: Number.parseInt(field.show_in_admin, 10) !== 0, // Use database setting, default to true if undefined
				}));
				setCustomFieldColumns(fieldColumns);
			} else {
				// Clear columns when no custom fields exist for this event
				setCustomFieldColumns([]);
			}
		}
	}, [customFields, columnVisibility]);

	useEffect(() => {
		const tableColumns = [
			{
				title: __("ID", "simplyconf"),
				dataIndex: "user_id",
				key: "user_id",
				visible: true,
				fixed: "left",
				width: 80,
				sorter: (a, b) => a.user_id - b.user_id,
				defaultSortOrder: "descend",
			},
			// 2. Display Name (NEW - PRIMARY IDENTIFIER)
			{
				title: __("Name", "simplyconf"),
				dataIndex: "display_name",
				key: "display_name",
				visible: true,
				fixed: "left",
				width: 200,
				sorter: (a, b) =>
					(a.display_name || "").localeCompare(b.display_name || ""),
				render: (_text, user) => {
					const displayName =
						user.display_name || user.username || `User #${user.user_id}`;
					return (
						<Button
							type="link"
							onClick={() => launchView(user.user_id)}
							className="simplyconf-table-link"
						>
							{displayName}
						</Button>
					);
				},
			},
			// 3. Email (NEW - SECONDARY IDENTIFIER)
			{
				title: __("Email", "simplyconf"),
				dataIndex: "email",
				key: "email",
				visible: true,
				fixed: "left",
				width: 250,
				sorter: (a, b) => (a.email || "").localeCompare(b.email || ""),
				render: (email) => (
					<Typography.Text copyable={{ text: email }}>{email}</Typography.Text>
				),
			},
			// 4. Username (NEW - TERTIARY IDENTIFIER)
			{
				title: __("Username", "simplyconf"),
				dataIndex: "username",
				key: "username",
				visible: visibleFixedColumns.username !== false,
				width: 150,
				sorter: (a, b) => (a.username || "").localeCompare(b.username || ""),
				render: (username) => (
					<Typography.Text type="secondary">{username}</Typography.Text>
				),
			},
		];

		// Add custom fields columns
		if (Array.isArray(customFieldColumns) && customFieldColumns.length > 0) {
			customFieldColumns.forEach((field) => {
				if (field.visible) {
					tableColumns.push({
						title: field.label,
						dataIndex: `custom_field_${field.field_id}`,
						key: `custom_field_${field.field_id}`,
						visible: true, // Already filtered by field.visible
						render: (text) => {
							if (!text && text !== 0 && text !== false)
								return <span style={{ color: "#999" }}>-</span>;

							switch (field.type) {
								case "file_upload":
									return <CustomFieldFileValue value={text} />;
								case "checkbox":
									return text
										? __("Yes", "simplyconf")
										: __("No", "simplyconf");
								case "date":
									return new Date(text).toLocaleDateString();
								case "select":
									return text;
								default:
									return text;
							}
						},
					});
				}
			});
		}

		// Roles column (conditionally added)
		if (visibleFixedColumns.roles) {
			tableColumns.push({
				title: __("Roles", "simplyconf"),
				dataIndex: "roles",
				key: "roles",
				visible: true,
				render: (roles, user) => {
					// Handle both array and single role for backward compatibility
					const userRoles = user.roles || roles;
					const currentRoles = Array.isArray(userRoles)
						? userRoles
						: userRoles
							? [userRoles]
							: user.role
								? [user.role]
								: ["viewer"];

					// Role color mapping
					const roleColors = {
						track_chair: "purple",
						reviewer: "blue",
						author: "green",
						viewer: "default",
					};

					// Role label mapping
					const roleLabels = {
						track_chair: __("Track Chair", "simplyconf"),
						reviewer: getTerm("reviewer", 1),
						author: __("Author", "simplyconf"),
						viewer: __("Viewer", "simplyconf"),
					};

					return (
						<Space direction="vertical" size={4}>
							<Space wrap>
								{currentRoles.map((role) => (
									<Tag
										key={role}
										color={roleColors[role] || "default"}
										style={{ margin: "2px" }}
									>
										{roleLabels[role] || role}
									</Tag>
								))}
							</Space>
							<Button
								data-testid={`user-${user.user_id}-edit-roles-btn`}
								type="text"
								size="small"
								onClick={() => {
									setSelectedUser(user);
									setIsRoleOpen(true);
								}}
								style={{ padding: "0 4px", height: "auto", fontSize: "12px" }}
							>
								{__("Edit Roles", "simplyconf")}
							</Button>
						</Space>
					);
				},
			});
		}

		// Actions column - always visible
		tableColumns.push({
			title: __("Action", "simplyconf"),
			key: "action",
			fixed: "right",
			visible: true,
			render: (_text, user) => (
				<Space
					size="middle"
					direction="vertical"
					id={`user-${user.user_id}-action`}
				>
					<Dropdown
						menu={{
							items: [
								{
									key: "user_view",
									label: __("View", "simplyconf"),
									icon: <ReadOutlined />,
									onClick: () => launchView(user.user_id),
								},
								{
									key: "user_edit",
									label: __("Edit", "simplyconf"),
									icon: <EditOutlined />,
									onClick: () => launchEdit(user.user_id),
								},
								{
									key: "user_delete",
									label: (
										<Popconfirm
											placement="topRight"
											title={__("Delete", "simplyconf")}
											description={__(
												"Are you sure you want to delete this user?",
												"simplyconf",
											)}
											okText={__("Delete", "simplyconf")}
											onConfirm={() => onDelete(user.user_id)}
											onCancel={(e) => e.stopPropagation()}
										>
											<span
												data-testid={`user-${user.user_id}-delete-confirm`}
												type="text"
												onClick={(e) => {
													e.stopPropagation();
												}}
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
						<Button data-testid={`user-${user.user_id}-actions-btn`}>
							<SettingOutlined />
						</Button>
					</Dropdown>
				</Space>
			),
		});
		setColumns(tableColumns);
	}, [
		customFieldColumns,
		launchEdit,
		launchView,
		onDelete,
		visibleFixedColumns,
		getTerm,
	]);

	useEffect(() => {
		if (!users || !Object.keys(users).length) {
			return;
		}
		const _data = [];
		Object.keys(users).forEach((id) => {
			try {
				const userData = { ...users[id], key: id };

				// Handle unified custom fields data
				if (users[id].custom_fields && Array.isArray(users[id].custom_fields)) {
					users[id].custom_fields.forEach((field) => {
						// Add custom field data with proper field naming
						userData[`custom_field_${field.field_id}`] = field.value;
					});
				}

				_data.push(userData);
			} catch (error) {
				console.error("Error @ useEffect[users]", error);
			}
		});
		setData(_data);
	}, [users]);

	const launchEdit = useCallback(
		(userId) => {
			setUuid(getUUID());
			dispatch(setUserId(userId));
			setIsEditOpen(true);
		},
		[dispatch],
	);

	const launchView = useCallback(
		(userId) => {
			setUuid(getUUID());
			dispatch(setUserId(userId));
			setIsViewOpen(true);
		},
		[dispatch],
	);
	const onDelete = useCallback(
		async (userId) => {
			try {
				await dispatch(deleteUser({ userId })).unwrap();
				closeDrawer();
			} catch (_err) {
				showError(__("Failed to delete user", "simplyconf"));
			}
		},
		[dispatch, closeDrawer],
	);

	const closeDrawer = () => {
		setIsViewOpen(false);
		setIsEditOpen(false);
	};

	// Refresh handler
	const handleRefresh = useCallback(() => {
		dispatch(getEventUsers());
	}, [dispatch]);

	// Bulk delete handler
	const handleBulkDelete = async () => {
		if (selectedRowKeys.length === 0) return;

		Modal.confirm({
			title: `${__("Delete", "simplyconf")} ${getTerm("user", 2)}`,
			content: `${__("Are you sure you want to delete {selectedRowKeys.length} selected {users}?", "simplyconf").replace("{selectedRowKeys.length}", selectedRowKeys.length).replace("{users}", getTerm("user", 2).toLowerCase())} ${__("This action cannot be undone.", "simplyconf")}`,
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				try {
					await Promise.all(
						selectedRowKeys.map((id) =>
							dispatch(deleteUser({ userId: id })).unwrap(),
						),
					);
					showSuccess(
						`${selectedRowKeys.length} ${__("users deleted successfully", "simplyconf")}`,
					);
					setSelectedRowKeys([]);
				} catch (error) {
					console.error("Bulk delete failed:", error);
					showError(
						__(
							"Some users could not be deleted. Please try again.",
							"simplyconf",
						),
					);
				}
			},
		});
	};

	const handleBulkAssignRole = async () => {
		if (bulkRoles.length === 0) {
			showError(__("Please select at least one role.", "simplyconf"));
			return;
		}
		try {
			await Promise.all(
				selectedRowKeys.map((userId) =>
					dispatch(
						setEventUserRole({ eventId, userId, roles: bulkRoles }),
					).unwrap(),
				),
			);
			showSuccess(
				__("Roles updated for {count} {users}", "simplyconf")
					.replace("{count}", selectedRowKeys.length)
					.replace(
						"{users}",
						getTerm("user", selectedRowKeys.length).toLowerCase(),
					),
			);
			setIsBulkRoleOpen(false);
			setBulkRoles([]);
			setSelectedRowKeys([]);
		} catch (err) {
			console.error("Bulk role assignment failed:", err);
			showError(
				__(
					"Failed to assign roles to some users. Please try again.",
					"simplyconf",
				),
			);
		}
	};

	const handleToggleCustomFieldColumn = useCallback(
		(fieldId) => {
			const updatedColumns = customFieldColumns.map((col) =>
				col.field_id === fieldId ? { ...col, visible: !col.visible } : col,
			);
			setCustomFieldColumns(updatedColumns);

			// Save custom field visibility to user preferences for persistence
			const customFieldVisibility = {};
			updatedColumns.forEach((col) => {
				customFieldVisibility[col.field_id] = col.visible;
			});

			dispatch(
				saveColumnVisibility({
					eventId,
					context: "users",
					visibility: {
						...visibleFixedColumns,
						customFields: customFieldVisibility,
					},
				}),
			);

			// Update the custom field visibility in the backend
			dispatch(
				toggleCustomFieldVisibility({
					fieldId,
					eventId,
					usage: "user",
				}),
			);
		},
		[dispatch, eventId, customFieldColumns, visibleFixedColumns],
	);

	const handleToggleFixedColumn = useCallback(
		async (columnKey) => {
			const updated = {
				...visibleFixedColumns,
				[columnKey]: !visibleFixedColumns[columnKey],
			};
			setVisibleFixedColumns(updated);
			await dispatch(
				saveColumnVisibility({
					eventId,
					context: "users",
					visibility: updated,
				}),
			);
		},
		[visibleFixedColumns, dispatch, eventId],
	);

	const handleRoleUpdate = async (newRoles) => {
		if (!selectedUser) return;

		try {
			await dispatch(
				setEventUserRole({
					eventId,
					userId: selectedUser.user_id,
					roles: newRoles.length > 0 ? newRoles : ["viewer"],
				}),
			).unwrap();
			showSuccess(
				__("Roles updated for user {user}", "simplyconf").replace(
					"{user}",
					selectedUser.display_name,
				),
			);
			setIsRoleOpen(false);
			setSelectedUser(null);
		} catch (error) {
			console.error("Error updating roles:", error);
			showError(__("Failed to update user roles", "simplyconf"));
		}
	};

	const columnsMemo = useMemo(
		() => (columns ? columns.filter((col) => col.visible) : []),
		[columns],
	);

	const dataMemo = useMemo(() => {
		let filtered = [...data];

		// Filter by role
		if (roleFilter !== "all") {
			filtered = filtered.filter((user) => {
				// Handle both array and single role for backward compatibility
				const userRoles = user.roles;
				const currentRoles = Array.isArray(userRoles)
					? userRoles
					: userRoles
						? [userRoles]
						: user.role
							? [user.role]
							: ["viewer"];

				// Check if the user has the selected role
				return currentRoles.includes(roleFilter);
			});
		}

		// Filter by search text (search in name, email, username)
		if (searchText) {
			const searchLower = searchText.toLowerCase();
			filtered = filtered.filter((user) => {
				const name = `${user.first_name || ""} ${
					user.last_name || ""
				}`.toLowerCase();
				const email = (user.email || "").toLowerCase();
				const username = (user.username || "").toLowerCase();

				return (
					name.includes(searchLower) ||
					email.includes(searchLower) ||
					username.includes(searchLower)
				);
			});
		}

		return filtered;
	}, [data, roleFilter, searchText]);

	// Row selection configuration for bulk actions
	const rowSelection = {
		selectedRowKeys,
		onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
	};

	// Role Editor Component
	const RoleEditor = ({ user, onRoleUpdate, onCancel }) => {
		const [selectedRoles, setSelectedRoles] = useState([]);
		const [loading, setLoading] = useState(false);

		const allowedRoles = [
			{
				value: "track_chair",
				label: __("Track Chair", "simplyconf"),
				color: "purple",
			},
			{
				value: "reviewer",
				label: getTerm("reviewer", 1),
				color: "blue",
			},
			{ value: "author", label: __("Author", "simplyconf"), color: "green" },
			{ value: "viewer", label: __("Viewer", "simplyconf"), color: "default" },
		];

		useEffect(() => {
			// Initialize with current user roles
			const userRoles = user.roles || [];
			const currentRoles = Array.isArray(userRoles)
				? userRoles
				: userRoles
					? [userRoles]
					: user.role
						? [user.role]
						: ["viewer"];
			setSelectedRoles(currentRoles);
		}, [user]);

		const handleSave = async () => {
			setLoading(true);
			try {
				await onRoleUpdate(selectedRoles);
			} finally {
				setLoading(false);
			}
		};

		return (
			<div>
				<p style={{ marginBottom: 16, color: "#666" }}>
					{__("Select the roles for this user:", "simplyconf")}
				</p>
				<Space direction="vertical" style={{ width: "100%" }}>
					{allowedRoles.map((role) => (
						<Checkbox
							key={role.value}
							checked={selectedRoles.includes(role.value)}
							onChange={(e) => {
								if (e.target.checked) {
									setSelectedRoles([...selectedRoles, role.value]);
								} else {
									setSelectedRoles(
										selectedRoles.filter((r) => r !== role.value),
									);
								}
							}}
						>
							<Tag color={role.color} style={{ margin: "0 8px 0 4px" }}>
								{role.label}
							</Tag>
						</Checkbox>
					))}
					{selectedRoles.includes("reviewer") && !hasAddon("reviews") && (
						<Alert
							message={__("Reviews Add-on Required", "simplyconf")}
							description={
								<span>
									{__("The Reviewer role requires the", "simplyconf")}{" "}
									<strong>{__("Reviews Add-on", "simplyconf")}</strong>{" "}
									{__("for full functionality.", "simplyconf")}
									<a
										href="https://simplyconf.com/addons/reviews"
										target="_blank"
										rel="noopener noreferrer"
										style={{ marginLeft: 4 }}
									>
										{__("Get it here", "simplyconf")}
									</a>
								</span>
							}
							type="warning"
							showIcon
							style={{ marginTop: 8 }}
						/>
					)}
				</Space>
				<div style={{ marginTop: 24, textAlign: "right" }}>
					<Space>
						<Button onClick={onCancel}>{__("Cancel", "simplyconf")}</Button>
						<Button
							type="primary"
							onClick={handleSave}
							loading={loading}
							disabled={selectedRoles.length === 0}
						>
							{__("Update Roles", "simplyconf")}
						</Button>
					</Space>
				</div>
			</div>
		);
	};

	return (
		<React.Fragment>
			<div className="simplyconf-page-stats">
				<UserStatsCards users={data} />
			</div>

			<div
				data-testid="users-header"
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Space>
							<Typography.Title level={3} style={{ margin: 0, color: "#fff" }}>
								{getTerm("user", 2)}
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
								({dataMemo.length} of {data.length})
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
												key: "bulk_assign_role",
												label: __("Assign Role", "simplyconf"),
												icon: <EditOutlined />,
												onClick: () => setIsBulkRoleOpen(true),
											},
											{ type: "divider" },
											{
												key: "bulk_delete",
												label: __("Delete Selected", "simplyconf"),
												icon: <DeleteOutlined />,
												danger: true,
												onClick: handleBulkDelete,
											},
										],
									}}
								>
									<Button className="simplyconf-bulk-actions-btn">
										{__("Bulk Actions ({count})", "simplyconf").replace(
											"{count}",
											selectedRowKeys.length,
										)}{" "}
										<MoreOutlined />
									</Button>
								</Dropdown>
							)}
							<Search
								data-testid="users-search-input"
								placeholder={__("Search {users}...", "simplyconf").replace(
									"{users}",
									getTerm("user", 2).toLowerCase(),
								)}
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								className="simplyconf-admin-search"
								allowClear
							/>{" "}
							<Select
								data-testid="users-role-filter"
								value={roleFilter}
								onChange={(value) => setRoleFilter(value)}
								style={{ width: 150 }}
								placeholder={__("Filter by role", "simplyconf")}
							>
								<Select.Option value="all">
									{__("All Roles", "simplyconf")}
								</Select.Option>
								<Select.Option value="track_chair">
									{__("Track Chair", "simplyconf")}
								</Select.Option>
								<Select.Option value="reviewer">
									{getTerm("reviewer", 1)}
								</Select.Option>
								<Select.Option value="author">
									{__("Author", "simplyconf")}
								</Select.Option>
								<Select.Option value="viewer">
									{__("Viewer", "simplyconf")}
								</Select.Option>
							</Select>
							<Button
								data-testid="users-refresh-btn"
								type="text"
								icon={<ReloadOutlined />}
								onClick={handleRefresh}
								className="simplyconf-secondary-action-btn"
								title={__("Refresh", "simplyconf")}
							/>
							<Button
								type="text"
								icon={<SyncOutlined />}
								onClick={() => dispatch(syncUsers())}
								title={__("Sync users from WordPress", "simplyconf")}
								className="simplyconf-secondary-action-btn"
							>
								{__("Sync Users", "simplyconf")}
							</Button>
							<Button
								data-testid="users-column-visibility-btn"
								type="text"
								icon={<LayoutOutlined />}
								onClick={() => setIsColumnsOpen(true)}
								size="middle"
								className="simplyconf-secondary-action-btn"
							/>
							<Button
								data-testid="users-create-btn"
								type="primary"
								size="middle"
								onClick={() => setIsCreateOpen(true)}
								icon={<PlusOutlined />}
								className="simplyconf-main-action-btn"
							>
								{__("Create", "simplyconf")}
							</Button>
						</Space>
					</Col>
				</Row>
			</div>

			{isLoading ? (
				<Spin tip={__("Loading...", "simplyconf")}>
					<Table
						data-testid="users-table"
						dataSource={dataMemo}
						columns={columnsMemo}
						rowSelection={rowSelection}
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
				</Spin>
			) : (
				<Table
					data-testid="users-table"
					dataSource={dataMemo}
					columns={columnsMemo}
					rowSelection={rowSelection}
					scroll={{ x: "max-content" }}
					pagination={{
						...getTablePagination({
							total: dataMemo.length,
							entityName: getTerm("user", 2).toLowerCase(),
							pageSize,
						}),
						onShowSizeChange: (_current, size) => setPageSize(size),
					}}
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
			)}

			<StyledModal
				data-testid="users-edit-modal"
				title={`Edit ${getTerm("user", 1)}`}
				titleIcon={<EditOutlined />}
				width={900}
				open={isEditOpen}
				onCancel={closeDrawer}
				footer={[
					<Button key="cancel" onClick={closeDrawer}>
						{__("Cancel", "simplyconf")}
					</Button>,
					<Button
						key="save"
						type="primary"
						form="user-wizard-form"
						htmlType="submit"
					>
						{__("Save", "simplyconf")}
					</Button>,
				]}
			>
				<UserWizard
					key={uuid}
					userId={userId}
					onClose={closeDrawer}
					hideFooter={true}
				/>
			</StyledModal>
			<StyledModal
				data-testid="users-view-modal"
				title={`View ${getTerm("user", 1)}`}
				titleIcon={<EyeOutlined />}
				width={900}
				open={isViewOpen}
				onCancel={closeDrawer}
				footer={[
					<Button key="close" onClick={closeDrawer}>
						{__("Close", "simplyconf")}
					</Button>,
				]}
			>
				<ViewUser key={uuid} onClose={closeDrawer} />
			</StyledModal>
			<StyledModal
				data-testid="users-column-modal"
				title={__("Manage Columns", "simplyconf")}
				titleIcon={<LayoutOutlined />}
				open={isColumnsOpen}
				onCancel={() => setIsColumnsOpen(false)}
				footer={null}
				width={650}
			>
				<div style={{ padding: "8px 0" }}>
					<Typography.Text type="secondary" style={{ fontSize: "13px" }}>
						{__(
							"Customize which columns are visible in your table view",
							"simplyconf",
						)}
					</Typography.Text>
				</div>

				<Space
					direction="vertical"
					style={{ width: "100%", marginTop: "16px" }}
					size="middle"
				>
					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
							marginBottom: "16px",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							🔒 {__("Core Identity Columns (Always Visible)", "simplyconf")}
						</Typography.Title>
						<Typography.Text
							type="secondary"
							style={{
								fontSize: "12px",
								marginBottom: "12px",
								display: "block",
							}}
						>
							{__(
								"These columns help you identify users across events",
								"simplyconf",
							)}
						</Typography.Text>
						<div style={{ marginTop: "12px" }}>
							<Tag color="blue" style={{ margin: "2px" }}>
								ID
							</Tag>
							<Tag color="blue" style={{ margin: "2px" }}>
								Name
							</Tag>
							<Tag color="blue" style={{ margin: "2px" }}>
								Email
							</Tag>
						</div>
					</div>

					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
							marginBottom: "16px",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							📌 {__("Optional Fixed Columns", "simplyconf")}
						</Typography.Title>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2, 1fr)",
								gap: "10px",
							}}
						>
							<Checkbox
								checked={visibleFixedColumns.username !== false}
								onChange={() => handleToggleFixedColumn("username")}
								style={{ padding: "4px 0" }}
							>
								{__("Username", "simplyconf")}
							</Checkbox>
							<Checkbox
								checked={visibleFixedColumns.roles}
								onChange={() => handleToggleFixedColumn("roles")}
								style={{ padding: "4px 0" }}
							>
								{__("Roles", "simplyconf")}
							</Checkbox>
						</div>
					</div>

					<div
						style={{
							background: "#fafafa",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid #f0f0f0",
						}}
					>
						<Typography.Title
							level={5}
							style={{ margin: "0 0 12px 0", color: "#262626" }}
						>
							📊 {__("Event-Specific Custom Fields", "simplyconf")}
						</Typography.Title>
						<Typography.Text
							type="secondary"
							style={{
								fontSize: "12px",
								marginBottom: "12px",
								display: "block",
							}}
						>
							{__(
								"These fields change based on the current event configuration. Default visibility is set by event administrators, but you can override these settings for your personal view.",
								"simplyconf",
							)}
						</Typography.Text>
						{customFieldColumns && customFieldColumns.length > 0 ? (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, 1fr)",
									gap: "10px",
								}}
							>
								{customFieldColumns.map((col) => (
									<Checkbox
										key={col.field_id}
										checked={col.visible}
										onChange={() => handleToggleCustomFieldColumn(col.field_id)}
										style={{ padding: "4px 0" }}
									>
										{col.label}
									</Checkbox>
								))}
							</div>
						) : (
							<div
								style={{
									textAlign: "center",
									padding: "20px",
									background: "#fff",
									borderRadius: "6px",
									border: "1px dashed #d9d9d9",
								}}
							>
								<Typography.Text type="secondary" style={{ fontSize: "13px" }}>
									{__(
										"No custom fields have been created for this event",
										"simplyconf",
									)}
								</Typography.Text>
							</div>
						)}
					</div>
				</Space>
			</StyledModal>

			{/* Role Editing Modal */}
			<StyledModal
				data-testid="users-role-modal"
				title={`${__("Edit Roles for", "simplyconf")} ${selectedUser?.display_name}`}
				open={isRoleOpen}
				onCancel={() => {
					setIsRoleOpen(false);
					setSelectedUser(null);
				}}
				footer={null}
				width={500}
			>
				{selectedUser && (
					<RoleEditor
						user={selectedUser}
						onRoleUpdate={handleRoleUpdate}
						onCancel={() => {
							setIsRoleOpen(false);
							setSelectedUser(null);
						}}
					/>
				)}
			</StyledModal>

			{/* Create User Guidance Modal */}
			<StyledModal
				data-testid="users-create-guidance-modal"
				title={__("Create {user}", "simplyconf").replace(
					"{user}",
					getTerm("user", 1),
				)}
				titleIcon={<PlusOutlined />}
				open={isCreateOpen}
				onCancel={() => setIsCreateOpen(false)}
				footer={[
					<Button key="cancel" onClick={() => setIsCreateOpen(false)}>
						{__("Cancel", "simplyconf")}
					</Button>,
					<Button
						key="wordpress-users"
						type="primary"
						onClick={() => {
							// Open WordPress users page in new tab
							window.open("/wp-admin/users.php", "_blank");
							setIsCreateOpen(false);
						}}
					>
						{__("Go to WordPress Users", "simplyconf")}
					</Button>,
				]}
				width={600}
			>
				<div style={{ padding: "20px 0" }}>
					<Alert
						message={__("User Creation in WordPress", "simplyconf")}
						description={
							<div>
								<p style={{ marginBottom: "16px" }}>
									{__(
										"To create a new user, please use the WordPress user management system. SimplyConf focuses on managing conference-specific user data and custom fields.",
										"simplyconf",
									)}
								</p>

								<h4 style={{ marginTop: "24px", marginBottom: "12px" }}>
									{__("Steps to create a user:", "simplyconf")}
								</h4>
								<ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
									<li>
										{__('Click "Go to WordPress Users" below', "simplyconf")}
									</li>
									<li>
										{__('Click "Add New" in WordPress Users', "simplyconf")}
									</li>
									<li>
										{__("Fill in the user information and save", "simplyconf")}
									</li>
									<li>
										{__(
											'Return to this page and click "Sync Users"',
											"simplyconf",
										)}
									</li>
									<li>
										{__(
											"Edit the user to add custom fields and assign roles",
											"simplyconf",
										)}
									</li>
								</ol>

								<div
									style={{
										marginTop: "24px",
										padding: "12px",
										background: "#f6ffed",
										border: "1px solid #b7eb8f",
										borderRadius: "6px",
									}}
								>
									<strong>{__("Why this approach?", "simplyconf")}</strong>
									<p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
										{__(
											"WordPress provides robust user management with security features, email notifications, and proper user account handling. SimplyConf enhances this with conference-specific custom fields and role management.",
											"simplyconf",
										)}
									</p>
								</div>
							</div>
						}
						type="info"
						showIcon
					/>
				</div>
			</StyledModal>
			<StyledModal
				data-testid="users-bulk-role-modal"
				title={__("Assign Roles to {count} {users}", "simplyconf")
					.replace("{count}", selectedRowKeys.length)
					.replace("{users}", getTerm("user", selectedRowKeys.length))}
				titleIcon={<EditOutlined />}
				open={isBulkRoleOpen}
				onCancel={() => {
					setIsBulkRoleOpen(false);
					setBulkRoles([]);
				}}
				width={500}
				footer={[
					<Button
						key="cancel"
						onClick={() => {
							setIsBulkRoleOpen(false);
							setBulkRoles([]);
						}}
					>
						{__("Cancel", "simplyconf")}
					</Button>,
					<Button
						key="assign"
						type="primary"
						disabled={bulkRoles.length === 0}
						onClick={handleBulkAssignRole}
					>
						{__("Assign Roles", "simplyconf")}
					</Button>,
				]}
			>
				<Alert
					type="warning"
					showIcon
					message={__(
						"This will replace the existing roles for all selected users.",
						"simplyconf",
					)}
					style={{ marginBottom: 16 }}
				/>
				<p style={{ color: "#666", marginBottom: 12 }}>
					{__("Select the roles to assign:", "simplyconf")}
				</p>
				<Space direction="vertical" style={{ width: "100%" }}>
					{[
						{
							value: "track_chair",
							label: __("Track Chair", "simplyconf"),
							color: "purple",
						},
						{ value: "reviewer", label: getTerm("reviewer", 1), color: "blue" },
						{
							value: "author",
							label: __("Author", "simplyconf"),
							color: "green",
						},
						{
							value: "viewer",
							label: __("Viewer", "simplyconf"),
							color: "default",
						},
					].map((role) => (
						<Checkbox
							key={role.value}
							checked={bulkRoles.includes(role.value)}
							onChange={(e) => {
								setBulkRoles(
									e.target.checked
										? [...bulkRoles, role.value]
										: bulkRoles.filter((r) => r !== role.value),
								);
							}}
						>
							<Tag color={role.color} style={{ margin: "0 8px 0 4px" }}>
								{role.label}
							</Tag>
						</Checkbox>
					))}
				</Space>
			</StyledModal>
		</React.Fragment>
	);
};

export default Users;
