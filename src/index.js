import "@assets/css/index.css";

import React, { Suspense, useEffect } from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import * as ReactRouterDOM from "react-router-dom";
import { HashRouter, Route, Routes, useParams } from "react-router-dom";

const Admin = React.lazy(() => import("./Admin"));
const Frontend = React.lazy(() => import("./Frontend"));

import { useTerminology } from "@hooks/useTerminology";
import * as RTK from "@reduxjs/toolkit";
import { AddonGate } from "@utils/addons";
import { setStore } from "@utils/axios";
import { __ } from "@wordpress/i18n";
import * as antd from "antd";
import { ConfigProvider, Spin } from "antd";
import * as ReactRedux from "react-redux";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { persistor, store } from "./state";
import {
	fetchAppearanceSettings,
	selectAppearanceSettings,
} from "./state/appearanceSlice";
import getThemeTokens from "./theme";
import { injectThemeVariables } from "./utils/cssVariables";

// Configure Ant Design notification globally
antd.notification.config({
	placement: "bottomRight",
	duration: 4,
	maxCount: 2,
	getContainer: () => document.body,
});

// Import Core API (must be loaded first to initialize window.simplyconf.api)
import "./api";

// Import utils (axios exposed to add-ons)
import * as utils from "./utils";

// Expose libraries globally for add-ons
window.React = React;
window.ReactDOM = ReactDOM;
window.ReactRedux = ReactRedux;
window.RTK = RTK;
window.ReactRouterDOM = ReactRouterDOM;
window.antd = antd;

// Initialize simplyconf namespace with Core API
if (!window.simplyconf) window.simplyconf = {};

window.simplyconf.store = store;
// Expose axios instance directly for addons
window.simplyconf.axios = utils.axios;
// Ensure utils namespace exists for add-ons to attach helpers (e.g. payments adds .registration)
if (!window.simplyconf.utils) window.simplyconf.utils = {};

// Core API is already exposed by the api module
// Signal that core is ready for add-ons to initialize
window.simplyconf.coreReady = true;

import Abstracts from "@components/admin/abstracts/Abstracts";
import Authors from "@components/admin/abstracts/Authors";
import AbstractsFormBuilder from "@components/admin/abstracts/FormBuilder";
import AbstractsSettings from "@components/admin/abstracts/Settings";
import AbstractsWrapper from "@components/admin/abstracts/Wrapper";
import Appearance from "@components/admin/appearance/Appearance";
import Dashboard from "@components/admin/dashboard/Dashboard";
import Events from "@components/admin/events/Events";
import StatusManagement from "@components/admin/events/StatusManagement";
import TerminologySettings from "@components/admin/events/TerminologySettings";
import EventsWrapper from "@components/admin/events/Wrapper";
import Licenses from "@components/admin/licenses/Licenses";
import SettingsWrapper from "@components/admin/settings/Wrapper";
import Tracks from "@components/admin/tracks/Tracks";
import UsersFormBuilder from "@components/admin/users/FormBuilder";
import UsersSettings from "@components/admin/users/Settings";
import Users from "@components/admin/users/Users";
import UsersWrapper from "@components/admin/users/Wrapper";

import UpgradePrompt from "@components/shared/UpgradePrompt";
import { createAddonComponent } from "@utils/addonFactory";

// Add-on components loaded dynamically from window.simplyconf.components
// These are wrapper functions that check at render time, not load time
// Reviews Add-on
const ReviewWrapper = createAddonComponent(
	"reviews",
	"ReviewWrapper",
	"Reviews",
);
const Reviews = createAddonComponent("reviews", "Reviews", "Reviews");
const ReviewSettings = createAddonComponent("reviews", "Settings", "Reviews");
const ReviewFormBuilder = createAddonComponent(
	"reviews",
	"FormBuilder",
	"Reviews",
);

// Emails Add-on
const EmailsWrapper = createAddonComponent("emails", "EmailWrapper", "Emails");
const Emails = createAddonComponent("emails", "Emails", "Emails");
const EmailSettings = createAddonComponent("emails", "Settings", "Emails");
const MailLog = createAddonComponent("emails", "MailLog", "Emails");
const EmailTemplateCreate = createAddonComponent(
	"emails",
	"EmailTemplateCreate",
	"Emails",
);
const EmailTemplateEdit = createAddonComponent(
	"emails",
	"EmailTemplateEdit",
	"Emails",
);

// Schedules Add-on
const ScheduleWrapper = createAddonComponent(
	"schedules",
	"ScheduleWrapper",
	"Schedules",
);
const Schedule = createAddonComponent("schedules", "Schedule", "Schedules");
const ScheduleBuilder = createAddonComponent(
	"schedules",
	"ScheduleBuilder",
	"Schedules",
);

// Payments Add-on
const PaymentsWrapper = createAddonComponent(
	"payments",
	"PaymentsWrapper",
	"Payments",
);
const Registrations = createAddonComponent(
	"payments",
	"Registrations",
	"Payments",
);
const RegistrationTypes = createAddonComponent(
	"payments",
	"RegistrationTypes",
	"Payments",
);
const PaymentSettings = createAddonComponent(
	"payments",
	"PaymentSettings",
	"Payments",
);
const DiscountCodes = createAddonComponent(
	"payments",
	"DiscountCodes",
	"Payments",
);
const PaymentReports = createAddonComponent(
	"payments",
	"PaymentReports",
	"Payments",
);
const ConferenceRegistration = createAddonComponent(
	"payments",
	"RegistrationForm",
	"Conference Registration",
);

// Exports Add-on
const ExportsWrapper = createAddonComponent(
	"exports",
	"ExportsWrapper",
	"Exports",
);
const ExportData = createAddonComponent("exports", "ExportData", "Exports");
const AbstractBook = createAddonComponent("exports", "AbstractBook", "Exports");
const ConferenceProgram = createAddonComponent(
	"exports",
	"ConferenceProgram",
	"Exports",
);

import Attachments from "@components/admin/abstracts/Attachments";
// frontend components
import UserDashboard from "@components/frontend/dashboard/Dashboard";
import UserSubmissions from "@components/frontend/submissions/Submissions";

// UserReviews is now loaded dynamically from the addon
const ReviewsFallback = () => {
	const { getTerm } = useTerminology();
	return (
		<div style={{ padding: "24px" }}>
			<h2>{getTerm("review", 2)}</h2>
			<p>
				{__("Review functionality requires the Reviews add-on.", "simplyconf")}
			</p>
		</div>
	);
};

const UserReviews = createAddonComponent(
	"reviews",
	"UserReviews",
	"Reviews",
	<ReviewsFallback />,
);

import Login from "@components/frontend/auth/Login";
import UserProfile from "@components/frontend/auth/Profile";
import Register from "@components/frontend/auth/Register";
// shared components
import AbstractSubmission from "@components/shared/abstracts/AbstractSubmission";
import AbstractView from "@components/shared/abstracts/AbstractView";
import NotFound from "@components/shared/NotFound";

const ReviewSubmission = (props) => {
	const Component = window.simplyconf?.components?.reviews?.ReviewSubmission;
	return Component ? (
		<Component {...props} />
	) : (
		<div style={{ padding: "24px" }}>
			<h2>{__("Submit Review", "simplyconf")}</h2>
			<p>
				{__("Review functionality requires the Reviews add-on.", "simplyconf")}
			</p>
		</div>
	);
};

const TrackManagement = (props) => {
	const Component = window.simplyconf?.components?.reviews?.TrackManagement;
	return Component ? (
		<Component {...props} />
	) : (
		<div style={{ padding: "24px" }}>
			<h2>{__("Track Management", "simplyconf")}</h2>
			<p>
				{__(
					"Track chair management requires the Reviews add-on.",
					"simplyconf",
				)}
			</p>
		</div>
	);
};

const TrackSubmissionView = (props) => {
	const Component = window.simplyconf?.components?.reviews?.TrackSubmissionView;
	return Component ? (
		<Component {...props} />
	) : (
		<div style={{ padding: "24px" }}>
			<h2>{__("Submission Review", "simplyconf")}</h2>
			<p>
				{__(
					"Submission review functionality requires the Reviews add-on.",
					"simplyconf",
				)}
			</p>
		</div>
	);
};

const ReviewView = (props) => {
	const Component = window.simplyconf?.components?.reviews?.ReviewView;
	return Component ? (
		<Component {...props} />
	) : (
		<div style={{ padding: "24px" }}>
			<h2>{__("Review View", "simplyconf")}</h2>
			<p>
				{__("Review functionality requires the Reviews add-on.", "simplyconf")}
			</p>
		</div>
	);
};

// Wrapper component for frontend submission view
const SubmissionViewWrapper = () => {
	const { abstractId } = useParams();
	return (
		<AbstractView
			abstractId={Number.parseInt(abstractId, 10)}
			context="frontend"
			showNavigation={false}
			showActions={true}
		/>
	);
};

// Wrapper component for admin submission view
const AdminSubmissionViewWrapper = () => {
	const { abstractId } = useParams();
	return (
		<AbstractView
			abstractId={Number.parseInt(abstractId, 10)}
			context="admin"
			showNavigation={false}
			showActions={true}
		/>
	);
};

/**
 * Reactive theme wrapper — reads appearance settings from Redux and
 * re-renders ConfigProvider whenever settings change (preset apply,
 * save, reset, etc.) without requiring a page refresh.
 */
const ThemeProvider = ({ children }) => {
	const settings = useSelector(selectAppearanceSettings);

	useEffect(() => {
		if (settings) {
			injectThemeVariables(settings);
		}
	}, [settings]);

	return (
		<ConfigProvider theme={getThemeTokens(settings || {})}>
			{children}
		</ConfigProvider>
	);
};

document.addEventListener("DOMContentLoaded", () => {
	// Initialize store reference for axios interceptor
	setStore(store);

	const adminElement = document.getElementById("simplyconf-admin");
	const dashboardElement = document.getElementById("simplyconf-dashboard");
	const loginElement = document.getElementById("simplyconf-login");

	// Fetch appearance settings and apply theme
	const initializeTheme = async () => {
		try {
			const result = await store.dispatch(fetchAppearanceSettings());
			const settings = result.payload || {};

			// Inject CSS variables for custom styling
			injectThemeVariables(settings);

			return settings;
		} catch (error) {
			console.error("Failed to load appearance settings:", error);
			return {};
		}
	};

	if (typeof adminElement !== "undefined" && adminElement !== null) {
		const root = createRoot(adminElement);

		// Initialize theme then render (ThemeProvider keeps it reactive)
		initializeTheme().then(() => {
			root.render(
				<Provider store={store}>
					<PersistGate loading={null} persistor={persistor}>
						<ThemeProvider>
							<ErrorBoundary>
								<HashRouter
									hashType="noslash"
									future={{
										v7_startTransition: true,
										v7_relativeSplatPath: true,
									}}
								>
									<Suspense
										fallback={
											<div
												style={{
													display: "flex",
													justifyContent: "center",
													alignItems: "center",
													minHeight: "100vh",
													flexDirection: "column",
												}}
											>
												<Spin size="large" />
												<div style={{ marginTop: 16 }}>
													{__("Loading Admin Panel...", "simplyconf")}
												</div>
											</div>
										}
									>
										<Routes basename="/wp-admin/admin.php?page=simplyconf">
											<Route path="/" element={<Admin />}>
												<Route path="" element={<Dashboard />} />
												<Route path="dashboard" element={<Dashboard />} />
												<Route path="events" element={<EventsWrapper />}>
													<Route path="" element={<Events />} />
													<Route path="tracks" element={<Tracks />} />
													<Route
														path="statuses"
														element={<StatusManagement />}
													/>
												</Route>
												<Route path="abstracts" element={<AbstractsWrapper />}>
													<Route path="" element={<Abstracts />} />
													<Route
														path="create"
														element={<AbstractSubmission />}
													/>
													<Route
														path="edit/:abstractId"
														element={<AbstractSubmission />}
													/>
													<Route
														path="view/:abstractId"
														element={<AdminSubmissionViewWrapper />}
													/>
													<Route
														path="settings"
														element={<AbstractsSettings />}
													/>
													<Route
														path="customfields"
														element={<AbstractsFormBuilder />}
													/>
													<Route path="authors" element={<Authors />} />
													<Route path="attachments" element={<Attachments />} />
												</Route>
												<Route path="users" element={<UsersWrapper />}>
													<Route index element={<Users />} />
													<Route path="settings" element={<UsersSettings />} />
													<Route
														path="customfields"
														element={<UsersFormBuilder />}
													/>
												</Route>
												<Route
													path="reviews"
													element={
														<AddonGate
															addon="reviews"
															fallback={
																<UpgradePrompt
																	feature="Reviews"
																	addonSlug="reviews"
																/>
															}
														>
															<ReviewWrapper />
														</AddonGate>
													}
												>
													<Route index element={<Reviews />} />
													<Route
														path="create/:abstractId"
														element={<ReviewSubmission />}
													/>
													<Route
														path="edit/:reviewId"
														element={<ReviewSubmission />}
													/>
													<Route
														path="view/:reviewId"
														element={<ReviewView />}
													/>
													<Route
														path="submission/:abstractId"
														element={<TrackSubmissionView />}
													/>
													<Route path="settings" element={<ReviewSettings />} />
													<Route
														path="customfields"
														element={<ReviewFormBuilder />}
													/>
												</Route>
												<Route
													path="emails"
													element={
														<AddonGate
															addon="emails"
															fallback={
																<UpgradePrompt
																	feature="Emails"
																	addonSlug="emails"
																/>
															}
														>
															<EmailsWrapper />
														</AddonGate>
													}
												>
													<Route index element={<Emails />} />
													<Route path="templates" element={<Emails />} />
													<Route
														path="templates/create"
														element={<EmailTemplateCreate />}
													/>
													<Route
														path="templates/:id/edit"
														element={<EmailTemplateEdit />}
													/>
													<Route path="log" element={<MailLog />} />
													<Route path="settings" element={<EmailSettings />} />
												</Route>
												<Route
													path="schedules"
													element={
														<AddonGate
															addon="schedules"
															fallback={
																<UpgradePrompt
																	feature="Schedule"
																	addonSlug="schedules"
																/>
															}
														>
															<ScheduleWrapper />
														</AddonGate>
													}
												>
													<Route index element={<Schedule />} />
													<Route path="builder" element={<ScheduleBuilder />} />
												</Route>
												<Route
													path="payments"
													element={
														<AddonGate
															addon="payments"
															fallback={
																<UpgradePrompt
																	feature="Payments"
																	addonSlug="payments"
																/>
															}
														>
															<PaymentsWrapper />
														</AddonGate>
													}
												>
													<Route index element={<Registrations />} />
													<Route path="reports" element={<PaymentReports />} />
													<Route path="types" element={<RegistrationTypes />} />
													<Route path="discounts" element={<DiscountCodes />} />
													<Route
														path="settings"
														element={<PaymentSettings />}
													/>
												</Route>
												<Route
													path="exports"
													element={
														<AddonGate
															addon="exports"
															fallback={
																<UpgradePrompt
																	feature="Exports"
																	addonSlug="exports"
																/>
															}
														>
															<ExportsWrapper />
														</AddonGate>
													}
												>
													<Route index element={<ExportData />} />
													<Route
														path="abstract-book"
														element={<AbstractBook />}
													/>
													<Route
														path="conference-program"
														element={<ConferenceProgram />}
													/>
												</Route>
												<Route path="settings" element={<SettingsWrapper />}>
													<Route index element={<Appearance />} />
													<Route path="appearance" element={<Appearance />} />
													<Route
														path="terminology"
														element={<TerminologySettings />}
													/>
													<Route path="licenses" element={<Licenses />} />
												</Route>
											</Route>
										</Routes>
									</Suspense>
								</HashRouter>
							</ErrorBoundary>
						</ThemeProvider>
					</PersistGate>
				</Provider>,
			);
		});
	}

	if (typeof dashboardElement !== "undefined" && dashboardElement !== null) {
		const root = createRoot(dashboardElement);

		// Initialize theme then render (ThemeProvider keeps it reactive)
		initializeTheme().then(() => {
			root.render(
				<Provider store={store}>
					<PersistGate loading={null} persistor={persistor}>
						<ThemeProvider>
							<ErrorBoundary>
								<HashRouter
									hashType="noslash"
									future={{
										v7_startTransition: true,
										v7_relativeSplatPath: true,
									}}
								>
									<Suspense
										fallback={
											<div
												style={{
													display: "flex",
													justifyContent: "center",
													alignItems: "center",
													minHeight: "100vh",
													flexDirection: "column",
												}}
											>
												<Spin size="large" />
												<div style={{ marginTop: 16 }}>
													{__("Loading Dashboard...", "simplyconf")}
												</div>
											</div>
										}
									>
										<Routes basename="/">
											<Route path="/" element={<Frontend />}>
												<Route path="" element={<UserSubmissions />} />
												<Route path="dashboard" element={<UserDashboard />} />
												<Route
													path="submissions"
													element={<UserSubmissions />}
												/>
												<Route
													path="submissions/create"
													element={<AbstractSubmission />}
												/>
												<Route
													path="submissions/edit/:abstractId"
													element={<AbstractSubmission />}
												/>
												<Route
													path="submissions/view/:abstractId"
													element={<SubmissionViewWrapper />}
												/>
												<Route path="reviews" element={<UserReviews />} />
												<Route
													path="reviews/submit/:assignmentId"
													element={<ReviewSubmission />}
												/>
												<Route
													path="reviews/view/:reviewId"
													element={<ReviewView />}
												/>
												<Route path="tracks" element={<TrackManagement />} />
												<Route
													path="tracks/view/:abstractId"
													element={<TrackSubmissionView />}
												/>
												<Route
													path="tracks/edit/:abstractId"
													element={<AbstractSubmission />}
												/>
												<Route
													path="conference-registration"
													element={<ConferenceRegistration />}
												/>
												<Route path="profile" element={<UserProfile />} />
												<Route
													path="login"
													element={
														<div
															style={{
																minHeight: "100vh",
																background: "#f5f5f5",
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																padding: "20px",
															}}
														>
															<div style={{ maxWidth: "400px", width: "100%" }}>
																<Login />
															</div>
														</div>
													}
												/>
												<Route
													path="register"
													element={
														<div
															style={{
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																padding: "20px",
															}}
														>
															<div style={{ maxWidth: "900px", width: "100%" }}>
																<Register />
															</div>
														</div>
													}
												/>
												<Route
													path="register-embedded"
													element={
														<Register
															onRegistrationComplete={() => {
																window.location.reload();
															}}
															onBackToLogin={() => {
																window.location.href =
																	window.location.origin +
																	window.location.pathname;
															}}
														/>
													}
												/>
												<Route path="*" element={<NotFound />} />
											</Route>
										</Routes>
									</Suspense>
								</HashRouter>
							</ErrorBoundary>
						</ThemeProvider>
					</PersistGate>
				</Provider>,
			);
		});
	}

	const registerElement = document.getElementById("simplyconf-register");

	if (typeof registerElement !== "undefined" && registerElement !== null) {
		const root = createRoot(registerElement);

		initializeTheme().then(() => {
			root.render(
				<Provider store={store}>
					<PersistGate loading={null} persistor={persistor}>
						<ThemeProvider>
							<ErrorBoundary>
								<HashRouter
									hashType="noslash"
									future={{
										v7_startTransition: true,
										v7_relativeSplatPath: true,
									}}
								>
									<Routes>
										<Route
											path="*"
											element={
												<Register
													onRegistrationComplete={() => {
														const loginUrl =
															window.simplyconf?.loginUrl ||
															`${window.location.origin}/`;
														window.location.href = loginUrl;
													}}
													onBackToLogin={() => {
														const loginUrl =
															window.simplyconf?.loginUrl ||
															`${window.location.origin}/`;
														window.location.href = loginUrl;
													}}
												/>
											}
										/>
									</Routes>
								</HashRouter>
							</ErrorBoundary>
						</ThemeProvider>
					</PersistGate>
				</Provider>,
			);
		});
	}

	if (typeof loginElement !== "undefined" && loginElement !== null) {
		const root = createRoot(loginElement);

		// Initialize theme then render
		initializeTheme().then(() => {
			root.render(
				<Provider store={store}>
					<PersistGate loading={null} persistor={persistor}>
						<ThemeProvider>
							<ErrorBoundary>
								<HashRouter
									hashType="noslash"
									future={{
										v7_startTransition: true,
										v7_relativeSplatPath: true,
									}}
								>
									<Routes>
										<Route
											path="*"
											element={
												<Login
													onLogin={async () => {
														// Redirect to the dashboard page after login
														const dashboardUrl =
															window.simplyconf?.dashboardUrl ||
															`${window.location.origin}/dashboard/`;
														window.location.href = dashboardUrl;
													}}
												/>
											}
										/>
									</Routes>
								</HashRouter>
							</ErrorBoundary>
						</ThemeProvider>
					</PersistGate>
				</Provider>,
			);
		});
	}
});
