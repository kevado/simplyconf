import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import useRecaptcha from "@hooks/useRecaptcha";
import ProgressIndicator from "@shared/progress/ProgressIndicator";
import {
	clearMessages,
	forgotPassword,
	login,
	resetPassword,
} from "@state/authSlice";
import { getSettings } from "@state/settingSlice";
import { showSuccess } from "@utils/feedback";
import { useRegistrationEnabled } from "@utils/userSettings";
import { __ } from "@wordpress/i18n";
import { Button, Card, Col, Form, Input, Row, Space, Typography } from "antd";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Register from "./Register";

const { Title, Paragraph, Text } = Typography;

const Login = ({ onLogin }) => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const eventId = useSelector((state) => state.events.globalId);
	const isRegistrationEnabled = useRegistrationEnabled();
	const { executeRecaptcha } = useRecaptcha();
	const { isLoading, hasError, errorMessage, successMessage, progress } =
		useSelector((state) => state.auth);

	// Fetch user settings when component mounts
	useEffect(() => {
		if (eventId) {
			dispatch(getSettings(eventId));
		}
	}, [dispatch, eventId]);
	// Check URL for password reset params (from email link redirect)
	const urlParams = new URLSearchParams(window.location.search);
	const urlResetKey = urlParams.get("reset_key") || "";
	const urlResetLogin = urlParams.get("reset_login") || "";

	const [formType, setFormType] = useState(
		urlResetKey && urlResetLogin ? "reset" : "login",
	);
	const [resetKey] = useState(urlResetKey);
	const [resetLogin] = useState(urlResetLogin);
	const [loginForm] = Form.useForm();
	const [forgotForm] = Form.useForm();
	const [resetForm] = Form.useForm();

	// Define login steps for progress indicator
	const loginSteps = [
		{ label: "Validate" },
		{ label: "Authenticate" },
		{ label: "Profile" },
		{ label: "Complete" },
	];

	// Clear messages when switching form types
	const switchFormType = (type) => {
		dispatch(clearMessages());
		setFormType(type);
	};

	const handleLogin = async (values) => {
		const recaptcha_token = await executeRecaptcha("login");
		const res = await dispatch(login({ ...values, recaptcha_token }));
		if (res.meta.requestStatus === "fulfilled" && res.payload.success) {
			showSuccess(__("Login successful!", "simplyconf"));
			// Trigger session check BEFORE navigation to ensure authentication state is ready
			if (onLogin) {
				await onLogin();
			}
			// Small delay to ensure state updates have propagated
			await new Promise((resolve) => setTimeout(resolve, 100));
			// Navigate to dashboard after session check completes
			navigate("/dashboard");
		} else {
			// Error is already handled by Redux state and displayed in UI
		}
	};

	const handleRegistrationComplete = () => {
		showSuccess(__("Registration successful! Please login.", "simplyconf"));
		switchFormType("login");
	};

	const handleForgot = (values) => {
		dispatch(forgotPassword(values.email)).then((res) => {
			if (res.meta.requestStatus === "fulfilled") {
				showSuccess(__("Password reset email sent!", "simplyconf"));
				switchFormType("login");
			}
		});
	};

	const handleReset = (values) => {
		dispatch(
			resetPassword({ ...values, key: resetKey, login: resetLogin }),
		).then((res) => {
			if (res.meta.requestStatus === "fulfilled") {
				showSuccess(
					__("Password reset successful! Please login.", "simplyconf"),
				);
				switchFormType("login");
			}
		});
	};

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
			}}
		>
			<Row
				justify="center"
				align="middle"
				style={{ width: "100%", maxWidth: "800px" }}
			>
				<Col xs={24} sm={20} md={16} lg={12} xl={10}>
					{formType === "register" ? (
						<Register
							onRegistrationComplete={handleRegistrationComplete}
							onBackToLogin={() => switchFormType("login")}
						/>
					) : (
						<Card
							style={{
								boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
								borderRadius: "8px",
							}}
						>
							<div style={{ textAlign: "center", marginBottom: "32px" }}>
								<Title level={2} style={{ margin: 0, color: "#262626" }}>
									{formType === "login"
										? __("Welcome Back", "simplyconf")
										: formType === "forgot"
											? __("Reset Password", "simplyconf")
											: __("New Password", "simplyconf")}
								</Title>
								<Paragraph type="secondary" style={{ margin: "8px 0 0 0" }}>
									{formType === "login"
										? __(
												"Enter your credentials to access your account",
												"simplyconf",
											)
										: formType === "forgot"
											? __(
													"Enter your email to receive reset instructions",
													"simplyconf",
												)
											: __("Enter your new password", "simplyconf")}
								</Paragraph>
							</div>

							{formType === "login" && (
								<Form
									form={loginForm}
									layout="vertical"
									onFinish={handleLogin}
									autoComplete="off"
									size="large"
								>
									<Form.Item
										name="username"
										initialValue=""
										rules={[
											{
												required: true,
												message: __(
													"Please enter your username or email",
													"simplyconf",
												),
											},
										]}
									>
										<Input
											prefix={<UserOutlined />}
											placeholder={__("Username or Email", "simplyconf")}
											autoFocus
										/>
									</Form.Item>
									<Form.Item
										name="password"
										initialValue=""
										rules={[
											{
												required: true,
												message: __("Please enter your password", "simplyconf"),
											},
										]}
									>
										<Input.Password
											prefix={<LockOutlined />}
											value=""
											placeholder={__("Password", "simplyconf")}
										/>
									</Form.Item>
									{hasError && (
										<div style={{ marginBottom: "16px" }}>
											<Text type="danger" style={{ display: "block" }}>
												{errorMessage}
											</Text>
										</div>
									)}

									{/* Progress Indicator */}
									{progress.isActive && (
										<div style={{ marginBottom: "24px" }}>
											<ProgressIndicator
												currentStep={progress.currentStep}
												steps={loginSteps}
												message={progress.message}
												percentage={progress.percentage}
												showPercentage={false}
												size="small"
											/>
										</div>
									)}

									<Form.Item>
										<Button
											type="primary"
											htmlType="submit"
											loading={isLoading}
											block
											size="large"
											style={{ height: "48px", fontSize: "16px" }}
										>
											{__("Sign In", "simplyconf")}
										</Button>
									</Form.Item>

									<div style={{ textAlign: "center" }}>
										<Space direction="vertical" size="small">
											{isRegistrationEnabled && (
												<Button
													type="link"
													onClick={() => navigate("/register")}
													style={{ padding: 0 }}
												>
													{__("Don't have an account?", "simplyconf")}{" "}
													<Text strong>{__("Create one", "simplyconf")}</Text>
												</Button>
											)}
											<Button
												type="link"
												onClick={() => switchFormType("forgot")}
												style={{ padding: 0, fontSize: "14px" }}
											>
												{__("Forgot your password?", "simplyconf")}
											</Button>
										</Space>
									</div>
								</Form>
							)}
							{formType === "forgot" && (
								<Form
									form={forgotForm}
									layout="vertical"
									onFinish={handleForgot}
									autoComplete="off"
									size="large"
								>
									<Form.Item
										name="email"
										rules={[
											{
												required: true,
												message: __("Please enter your email", "simplyconf"),
											},
											{
												type: "email",
												message: __("Please enter a valid email", "simplyconf"),
											},
										]}
									>
										<Input
											prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
											placeholder={__("Email address", "simplyconf")}
										/>
									</Form.Item>
									{hasError && (
										<div style={{ marginBottom: "16px" }}>
											<Text type="danger" style={{ display: "block" }}>
												{errorMessage}
											</Text>
										</div>
									)}
									<Form.Item>
										<Button
											type="primary"
											htmlType="submit"
											loading={isLoading}
											block
											size="large"
											style={{ height: "48px", fontSize: "16px" }}
										>
											{__("Send Reset Email", "simplyconf")}
										</Button>
									</Form.Item>

									<div style={{ textAlign: "center" }}>
										<Button
											type="link"
											onClick={() => switchFormType("login")}
											style={{ padding: 0 }}
										>
											{__("← Back to Login", "simplyconf")}
										</Button>
									</div>
								</Form>
							)}
							{formType === "reset" && (
								<Form
									form={resetForm}
									layout="vertical"
									onFinish={handleReset}
									autoComplete="off"
									size="large"
								>
									<Form.Item
										name="password"
										rules={[
											{
												required: true,
												message: __(
													"Please enter your new password",
													"simplyconf",
												),
											},
											{
												min: 6,
												message: __(
													"Password must be at least 6 characters",
													"simplyconf",
												),
											},
										]}
									>
										<Input.Password
											prefix={<LockOutlined />}
											placeholder={__("New password", "simplyconf")}
										/>
									</Form.Item>
									{hasError && (
										<div style={{ marginBottom: "16px" }}>
											<Text type="danger" style={{ display: "block" }}>
												{errorMessage}
											</Text>
										</div>
									)}
									<Form.Item>
										<Button
											type="primary"
											htmlType="submit"
											loading={isLoading}
											block
											size="large"
											style={{ height: "48px", fontSize: "16px" }}
										>
											{__("Reset Password", "simplyconf")}
										</Button>
									</Form.Item>

									<div style={{ textAlign: "center" }}>
										<Button
											type="link"
											onClick={() => switchFormType("login")}
											style={{ padding: 0 }}
										>
											{__("← Back to Login", "simplyconf")}
										</Button>
									</div>
								</Form>
							)}
							{successMessage && (
								<div style={{ marginTop: "16px", textAlign: "center" }}>
									<Text type="success">{successMessage}</Text>
								</div>
							)}
						</Card>
					)}
				</Col>
			</Row>
		</div>
	);
};

Login.propTypes = {
	onLogin: PropTypes.func,
};

export default Login;
