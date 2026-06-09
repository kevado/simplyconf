import {
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
} from "@ant-design/icons";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Alert, Button, Card, Modal, Space, Spin, Typography } from "antd";

import PropTypes from "prop-types";
import { useEffect, useState } from "react";

const { Title, Text, Link } = Typography;
const { confirm } = Modal;

const DashboardSetup = ({ eventId }) => {
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [dashboardStatus, setDashboardStatus] = useState(null);

	useEffect(() => {
		fetchDashboardStatus();
	}, [fetchDashboardStatus]);

	const fetchDashboardStatus = async () => {
		setLoading(true);
		try {
			const url = `${window.simplyconf.apiUrl}/dashboard-setup/status?event_id=${eventId}`;
			const response = await fetch(url, {
				headers: {
					"X-WP-Nonce": window.simplyconf.nonce,
				},
			});
			const data = await response.json();
			setDashboardStatus(data);
		} catch (_error) {
			showError(__("Failed to fetch dashboard status.", "simplyconf"));
		} finally {
			setLoading(false);
		}
	};

	const handleCreateDashboard = async () => {
		setCreating(true);
		try {
			const response = await fetch(
				`${window.simplyconf.apiUrl}/dashboard-setup/create`,
				{
					method: "POST",
					headers: {
						"X-WP-Nonce": window.simplyconf.nonce,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ event_id: eventId }),
				},
			);
			const data = await response.json();

			if (data.success) {
				showSuccess(data.message);
				fetchDashboardStatus();
			} else {
				showWarning(data.message);
			}
		} catch (_error) {
			showError(__("Failed to create dashboard page.", "simplyconf"));
		} finally {
			setCreating(false);
		}
	};

	const handleDeleteDashboard = () => {
		confirm({
			title: __("Delete Dashboard Page?", "simplyconf"),
			icon: <ExclamationCircleOutlined />,
			content: __(
				"Are you sure you want to delete the existing dashboard page? This action cannot be undone.",
				"simplyconf",
			),
			okText: __("Delete", "simplyconf"),
			okType: "danger",
			cancelText: __("Cancel", "simplyconf"),
			onOk: async () => {
				setDeleting(true);
				try {
					const response = await fetch(
						`${window.simplyconf.apiUrl}/dashboard-setup/delete`,
						{
							method: "DELETE",
							headers: {
								"X-WP-Nonce": window.simplyconf.nonce,
							},
						},
					);
					const data = await response.json();

					if (data.success) {
						showSuccess(data.message);
						fetchDashboardStatus();
					} else {
						showError(data.message);
					}
				} catch (_error) {
					showError(__("Failed to delete dashboard page.", "simplyconf"));
				} finally {
					setDeleting(false);
				}
			},
		});
	};

	if (loading) {
		return <Spin />;
	}

	return (
		<Card
			title={
				<Space>
					<CheckCircleOutlined />
					{__("User Dashboard", "simplyconf")}
				</Space>
			}
			className="simplyconf-content-card"
			style={{ marginBottom: 24 }}
		>
			{!dashboardStatus?.exists ? (
				<Space direction="vertical" size="middle" style={{ width: "100%" }}>
					<Alert
						message={__("No Dashboard Page Found", "simplyconf")}
						description={__(
							"Create a dedicated page for your conference participants to access their dashboard. This page will use the SimplyConf Dashboard block for optimal display.",
							"simplyconf",
						)}
						type="info"
						showIcon
					/>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={handleCreateDashboard}
						loading={creating}
						size="large"
					>
						{__("Create Dashboard Page", "simplyconf")}
					</Button>
				</Space>
			) : (
				<Space direction="vertical" size="middle" style={{ width: "100%" }}>
					<Alert
						message={__("Dashboard Page Active", "simplyconf")}
						description={
							<>
								{__(
									"Your dashboard page is set up and ready to use.",
									"simplyconf",
								)}
								<br />
								<Text strong>{__("Page:", "simplyconf")}</Text>{" "}
								{dashboardStatus.title}
							</>
						}
						type="success"
						showIcon
					/>
					<Space>
						<Button
							type="primary"
							href={dashboardStatus.page_url}
							target="_blank"
							rel="noopener noreferrer"
						>
							{__("View", "simplyconf")}
						</Button>
						<Button
							href={dashboardStatus.edit_url}
							target="_blank"
							rel="noopener noreferrer"
						>
							{__("Edit", "simplyconf")}
						</Button>
						<Button danger onClick={handleDeleteDashboard} loading={deleting}>
							{__("Delete", "simplyconf")}
						</Button>
					</Space>
				</Space>
			)}
		</Card>
	);
};

DashboardSetup.propTypes = {
	eventId: PropTypes.number.isRequired,
};

export default DashboardSetup;
