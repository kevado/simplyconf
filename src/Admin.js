import {
	BarChartOutlined,
	BgColorsOutlined,
	CalendarOutlined,
	CommentOutlined,
	DashboardOutlined,
	DollarOutlined,
	FileOutlined,
	FormOutlined,
	MailOutlined,
	SafetyCertificateOutlined,
	SettingOutlined,
	TagsOutlined,
	UnorderedListOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { upperFirst } from "@utils";
import { Col, ConfigProvider, Layout, Menu, Row, Select } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Content } = Layout;

import { useFeatureSync } from "@hooks/useFeatureSync";
import { useTerminology } from "@hooks/useTerminology";
import {
	changeGlobalEvent,
	getEvents,
	setDefaultEvent,
} from "@state/eventSlice";
import { getSettings } from "@state/settingSlice";
import { getAntdLocale, getTextDirection } from "@utils/locale";
import { __ } from "@wordpress/i18n";

const Admin = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const location = useLocation();

	// Enable feature sync polling in SaaS mode (checks every 60 seconds)
	useFeatureSync();

	// Redux state using useSelector
	const events = useSelector((state) => state.events.events || {});
	const eventIds = useSelector((state) => state.events.eventIds || []);
	const globalId = useSelector((state) => state.events.globalId);

	const { getTerm } = useTerminology();

	const [currentTab, setCurrentTab] = useState("");
	const [_crumbs, setCrumbs] = useState([]);
	const [formatEvents, setFormatEvents] = useState([]);

	useEffect(() => {
		const path = location.pathname.replace("/", "");
		setCurrentTab(path);
	}, [location]);

	useEffect(() => {
		dispatch(getEvents());
	}, [dispatch]);

	useEffect(() => {
		const _evtData = [];
		eventIds.forEach((eId) => {
			const event = events[eId];
			// Only include active events (exclude archived events where status === 0)
			if (event && (event.status === 1 || event.status === "1")) {
				_evtData.push({ value: Number.parseInt(eId, 10), label: event.name });
			}
		});

		if (_evtData.length > 0) {
			setFormatEvents(_evtData);
		} else {
			setFormatEvents({
				value: 0,
				label: __("Create an Event", "simplyconf"),
			});
		}
	}, [events, eventIds]);

	// reload event settings when globalId changes
	useEffect(() => {
		if (globalId) {
			dispatch(getSettings(globalId));
		}
	}, [globalId, dispatch]);

	const handleClick = (e) => {
		setCurrentTab(e.key);
		navigate(`/${e.key}`);
	};

	const _logoClick = () => {
		setCurrentTab("dashboard");
		navigate("/dashboard");
	};

	const _breadCrumbClick = useCallback(
		(path) => {
			setCurrentTab(path);
			navigate(`/${path}`);
		},
		[navigate],
	);

	const handleEvtChange = (evtId) => {
		dispatch(changeGlobalEvent(evtId));
		dispatch(setDefaultEvent({ eventId: evtId }));
	};

	useEffect(() => {
		if (currentTab) {
			const _current = currentTab.split("/");
			const _crumbs = _current.map((tab) => {
				return {
					title: upperFirst(tab),
					path: tab,
				};
			});
			setCrumbs(_crumbs);
		}
	}, [currentTab]);

	const isSaas = window.simplyconf?.isSaas === "true";

	const settingsChildren = [
		{
			label: __("Appearance", "simplyconf"),
			key: "settings/appearance",
			icon: <BgColorsOutlined />,
		},
		{
			label: __("Terminology", "simplyconf"),
			key: "settings/terminology",
			icon: <UnorderedListOutlined />,
		},
	];

	if (!isSaas) {
		settingsChildren.push({
			label: __("Licenses", "simplyconf"),
			key: "settings/licenses",
			icon: <SafetyCertificateOutlined />,
		});
	}

	const menuItems = [
		{
			label: __("Dashboard", "simplyconf"),
			key: "dashboard",
			icon: <DashboardOutlined />,
		},
		{
			label: __("Events", "simplyconf"),
			key: "events",
			icon: <CalendarOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: getTerm("track", 2),
					key: "events/tracks",
					icon: <UnorderedListOutlined />,
				},
				{
					label: __("Statuses", "simplyconf"),
					key: "events/statuses",
					icon: <TagsOutlined />,
				},
			],
		},
		{
			label: getTerm("abstract", 2),
			key: "abstracts",
			icon: <UnorderedListOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Authors", "simplyconf"),
					key: "abstracts/authors",
					icon: <UserOutlined />,
				},
				{
					label: __("Attachments", "simplyconf"),
					key: "abstracts/attachments",
					icon: <FileOutlined />,
				},
				{
					label: __("Custom Fields", "simplyconf"),
					key: "abstracts/customfields",
					icon: <FormOutlined />,
				},
				{
					label: __("Settings", "simplyconf"),
					key: "abstracts/settings",
					icon: <SettingOutlined />,
				},
			],
		},
		{
			label: getTerm("user", 2),
			key: "users",
			icon: <UserOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Custom Fields", "simplyconf"),
					key: "users/customfields",
					icon: <FormOutlined />,
				},
				{
					label: __("Settings", "simplyconf"),
					key: "users/settings",
					icon: <SettingOutlined />,
				},
			],
		},
		{
			label: getTerm("review", 2),
			key: "reviews",
			icon: <CommentOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Custom Fields", "simplyconf"),
					key: "reviews/customfields",
					icon: <FormOutlined />,
				},
				{
					label: __("Settings", "simplyconf"),
					key: "reviews/settings",
					icon: <SettingOutlined />,
				},
			],
		},
		{
			label: __("Emails", "simplyconf"),
			key: "emails",
			icon: <MailOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Mail Log", "simplyconf"),
					key: "emails/log",
					icon: <SettingOutlined />,
				},
				{
					label: __("Settings", "simplyconf"),
					key: "emails/settings",
					icon: <SettingOutlined />,
				},
			],
		},
		{
			label: __("Payments", "simplyconf"),
			key: "payments",
			icon: <DollarOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Registration Types", "simplyconf"),
					key: "payments/types",
					icon: <UnorderedListOutlined />,
				},
				{
					label: __("Discount Codes", "simplyconf"),
					key: "payments/discounts",
					icon: <TagsOutlined />,
				},
				{
					label: __("Reports", "simplyconf"),
					key: "payments/reports",
					icon: <BarChartOutlined />,
				},
				{
					label: __("Settings", "simplyconf"),
					key: "payments/settings",
					icon: <SettingOutlined />,
				},
			],
		},
		{
			label: __("Schedules", "simplyconf"),
			key: "schedules",
			icon: <CalendarOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Builder", "simplyconf"),
					key: "schedules/builder",
					icon: <FormOutlined />,
				},
			],
		},
		{
			label: __("Exports", "simplyconf"),
			key: "exports",
			icon: <BarChartOutlined />,
			onTitleClick: handleClick,
			children: [
				{
					label: __("Abstract Book", "simplyconf"),
					key: "exports/abstract-book",
					icon: <FileOutlined />,
				},
				{
					label: __("Conference Program", "simplyconf"),
					key: "exports/conference-program",
					icon: <CalendarOutlined />,
				},
			],
		},
		{
			label: __("Settings", "simplyconf"),
			key: "settings",
			icon: <SettingOutlined />,
			onTitleClick: handleClick,
			children: settingsChildren,
		},
	];

	// Always show all menu items for discovery/upsell
	// Upgrade prompts are shown at the route level when add-ons not installed

	const [antdLocale, setAntdLocale] = useState(null);
	const [direction, setDirection] = useState("ltr");

	useEffect(() => {
		// Load Ant Design locale dynamically based on current WordPress locale
		getAntdLocale().then((locale) => {
			setAntdLocale(locale);
		});

		// Set text direction based on locale
		setDirection(getTextDirection());
	}, []);

	// Don't render until we have the locale loaded
	if (!antdLocale) {
		return null; // Or a loading spinner
	}

	return (
		<ConfigProvider locale={antdLocale} direction={direction} prefixCls="sc">
			<Layout className="layout">
				<Header className="simplyconf-layout-header">
					<Row gutter={16}>
						<Col className="gutter-row" span={19}>
							<Menu
								onClick={handleClick}
								selectedKeys={[currentTab]}
								mode="horizontal"
								items={menuItems}
							/>
						</Col>
						<Col className="gutter-row" span={5}>
							{formatEvents && (
								<Select
									value={globalId}
									style={{ width: 180 }}
									onChange={handleEvtChange}
									options={formatEvents}
								/>
							)}
						</Col>
					</Row>
				</Header>
				<Content className="wpabs-site-layout-content">
					<Outlet />
				</Content>
			</Layout>
		</ConfigProvider>
	);
};

export default Admin;
