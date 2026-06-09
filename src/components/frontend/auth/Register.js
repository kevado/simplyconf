import {
	EyeOutlined,
	InfoCircleOutlined,
	LockOutlined,
	MailOutlined,
	UserOutlined,
} from "@ant-design/icons";
import useRecaptcha from "@hooks/useRecaptcha";
import { useTerminology } from "@hooks/useTerminology";
import PasswordStrengthIndicator from "@shared/auth/PasswordStrengthIndicator";
import ConditionalCustomFields from "@shared/customFields/ConditionalCustomFields";
import ProgressIndicator from "@shared/progress/ProgressIndicator";
import { register } from "@state/authSlice";
import {
	fetchPublicUserFields,
	selectUserFields,
} from "@state/customFieldsSlice";
import { showError, showSuccess } from "@utils/feedback";
import {
	clearRegistrationData,
	loadRegistrationData,
	saveRegistrationData,
} from "@utils/registrationPersistence";
import {
	usePasswordRequirements,
	useRegistrationEnabled,
	useSmartUserSettings,
	validatePassword,
} from "@utils/userSettings";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Form,
	Input,
	Select,
	Space,
	Spin,
	Steps,
	Typography,
} from "antd";
import PropTypes from "prop-types";
/* eslint-disable no-mixed-spaces-and-tabs */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const Register = ({ onRegistrationComplete, onBackToLogin }) => {
	const dispatch = useDispatch();
	const { getTerm } = useTerminology();
	const navigate = useNavigate();
	const { executeRecaptcha } = useRecaptcha();
	const { isLoading, progress } = useSelector((state) => state.auth);
	const _eventId = useSelector((state) => state.events.globalId);
	const {
		settings,
		isLoading: settingsLoading,
		hasError,
	} = useSmartUserSettings();
	const isRegistrationEnabled = useRegistrationEnabled();
	const passwordRequirements = usePasswordRequirements();

	// Step management
	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] = useState({});
	const [passwordValue, setPasswordValue] = useState("");

	// Form instances for each step
	const [accountForm] = Form.useForm();
	const [customFieldsForm] = Form.useForm();
	const [customFieldsFormValues, setCustomFieldsFormValues] = useState({});
	const [visibleCustomFields, setVisibleCustomFields] = useState([]);
	const [isPasswordValid, setIsPasswordValid] = useState(false);
	const [isEmailValid, setIsEmailValid] = useState(false);
	const [hasValidatedSavedData, setHasValidatedSavedData] = useState(false);

	// Define registration steps for progress indicator
	const registrationSteps = [
		{ label: "Account" },
		{ label: "Auth" },
		{ label: "Profile" },
		{ label: "Fields" },
		{ label: "Complete" },
	];

	// Redux state
	const { customFields, customFieldsLoading } = useSelector((state) => ({
		customFields: selectUserFields(state),
		customFieldsLoading: state.customFields.isLoading.user,
	}));

	// Load custom fields for user registration (public endpoint - no auth required)
	useEffect(() => {
		const eventId = window.simplyconf?.eventId || null;
		dispatch(fetchPublicUserFields(eventId));
	}, [dispatch]);

	// Load saved registration data on component mount
	useEffect(() => {
		const savedData = loadRegistrationData();
		if (savedData) {
			setFormData(savedData.formData);
			setCurrentStep(savedData.currentStep);

			// Restore form values after a short delay to ensure forms are mounted
			setTimeout(() => {
				if (Object.keys(savedData.formData).length > 0) {
					accountForm.setFieldsValue(savedData.formData);
					customFieldsForm.setFieldsValue(savedData.formData);
					setCustomFieldsFormValues(savedData.formData);
				}
			}, 200);
		}
	}, [accountForm.setFieldsValue, customFieldsForm.setFieldsValue]);

	// Validate saved data when passwordRequirements are available
	useEffect(() => {
		if (!hasValidatedSavedData && passwordRequirements) {
			const savedData = loadRegistrationData();
			if (savedData) {
				// Validate email if it exists in saved data
				if (savedData.formData.email) {
					const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
					setIsEmailValid(emailRegex.test(savedData.formData.email));
				}

				// Validate password if it exists in saved data
				if (savedData.formData.password) {
					const validation = validatePassword(
						savedData.formData.password,
						passwordRequirements,
					);
					setIsPasswordValid(validation.isValid);
					setPasswordValue(savedData.formData.password);
				}
			}
			setHasValidatedSavedData(true);
		}
	}, [passwordRequirements, hasValidatedSavedData]);

	// Save registration data when form data or current step changes
	useEffect(() => {
		if (Object.keys(formData).length > 0) {
			saveRegistrationData(formData, currentStep);
		}
	}, [formData, currentStep]);

	const steps = [
		{
			title: __("Account", "simplyconf"),
			description: __("Basic Information", "simplyconf"),
			icon: <UserOutlined />,
		},
		{
			title: __("Details", "simplyconf"),
			description: __("Additional Information", "simplyconf"),
			icon: <InfoCircleOutlined />,
		},
		{
			title: getTerm("review", 1),
			description: __("Confirm & Submit", "simplyconf"),
			icon: <EyeOutlined />,
		},
	];

	const handleEmailChange = (e) => {
		const email = e.target.value;
		// Simple email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		setIsEmailValid(emailRegex.test(email));
	};

	const handlePasswordChange = (e) => {
		const password = e.target.value;
		setPasswordValue(password);

		// Check password validity
		if (password) {
			const validation = validatePassword(password, passwordRequirements);
			setIsPasswordValid(validation.isValid);
		} else {
			setIsPasswordValid(false);
		}
	};

	const handleStepSubmit = async (values, stepIndex) => {
		// Update form data with current step values
		const updatedFormData = { ...formData, ...values };
		setFormData(updatedFormData);

		if (stepIndex === 0) {
			// Account information step - move to next step
			setCurrentStep(1);
			// Set values for custom fields form if available
			setTimeout(() => {
				if (Object.keys(updatedFormData).length > 0) {
					customFieldsForm.setFieldsValue(updatedFormData);
					// Update formValues state so conditional logic evaluates correctly
					setCustomFieldsFormValues(updatedFormData);
				}
			}, 100);
		} else if (stepIndex === 1) {
			// Custom fields step - capture values and move to review step
			const customFieldValues = customFieldsForm.getFieldsValue();

			// Merge custom field values into the main form data
			const mergedFormData = { ...updatedFormData, ...customFieldValues };
			setFormData(mergedFormData);

			setCurrentStep(2);
		} else if (stepIndex === 2) {
			// Review step - submit registration
			await submitRegistration(updatedFormData);
		}
	};

	const submitRegistration = async (allFormData) => {
		try {
			// Execute reCAPTCHA before submitting
			const recaptcha_token = await executeRecaptcha("register");

			// Extract custom field values from the captured form data
			const custom_fields = visibleCustomFields.map((field) => {
				const fieldKey = String(field.field_id);
				const fieldValue = allFormData[fieldKey] || "";

				return {
					field_id: field.field_id,
					value: fieldValue,
				};
			});

			const registrationPayload = {
				login: allFormData.email, // Use email as username
				email: allFormData.email,
				password: allFormData.password,
				custom_fields: custom_fields,
				recaptcha_token,
			};

			const result = await dispatch(register(registrationPayload));

			if (result.meta.requestStatus === "fulfilled" && result.payload.success) {
				// Clear saved registration data after successful registration
				clearRegistrationData();

				showSuccess(
					__(
						"Registration successful! Please login with your new account.",
						"simplyconf",
					),
				);

				if (onRegistrationComplete) {
					onRegistrationComplete();
				} else {
					navigate("/login");
				}
			} else {
				showError(__("Registration failed. Please try again.", "simplyconf"));
			}
		} catch (_error) {
			showError(__("Registration failed. Please try again.", "simplyconf"));
		}
	};

	const handlePrevious = () => {
		// Save current form values before going back
		const currentValues =
			currentStep === 1
				? customFieldsForm.getFieldsValue()
				: currentStep === 2
					? {}
					: {};
		setFormData({ ...formData, ...currentValues });
		setCurrentStep(currentStep - 1);

		// Restore values to previous form
		setTimeout(() => {
			if (currentStep === 1) {
				accountForm.setFieldsValue(formData);
			} else if (currentStep === 2) {
				customFieldsForm.setFieldsValue(formData);
			}
		}, 100);
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 0:
				return (
					<Form
						form={accountForm}
						layout="vertical"
						size="large"
						onFinish={(values) => handleStepSubmit(values, 0)}
						onValuesChange={(_changed, all) =>
							setFormData((prev) => ({ ...prev, ...all }))
						}
						autoComplete="off"
						initialValues={formData}
					>
						<Title level={4}>{__("Account Information", "simplyconf")}</Title>
						<Paragraph type="secondary">
							{__(
								"Enter your email address and create a password for your account.",
								"simplyconf",
							)}
						</Paragraph>

						<Form.Item
							name="email"
							label={__("Email Address", "simplyconf")}
							rules={[
								{
									required: true,
									message: __("Please enter your email", "simplyconf"),
								},
								{
									type: "email",
									message: __(
										"Please enter a valid email address",
										"simplyconf",
									),
								},
							]}
						>
							<Input
								prefix={<MailOutlined />}
								placeholder={__("your.email@example.com", "simplyconf")}
								onChange={handleEmailChange}
							/>
						</Form.Item>

						<Form.Item
							name="password"
							label={__("Password", "simplyconf")}
							rules={[
								{
									required: true,
									message: __("Please enter a password", "simplyconf"),
								},
							]}
						>
							<Input.Password
								prefix={<LockOutlined />}
								placeholder={__(
									`Create a strong password (min. ${passwordRequirements.minLength} characters)`,
									"simplyconf",
								)}
								onChange={handlePasswordChange}
								maxLength={passwordRequirements.maxLength}
							/>
						</Form.Item>

						<PasswordStrengthIndicator
							password={passwordValue}
							requirements={passwordRequirements}
						/>

						<Form.Item style={{ marginTop: 32 }}>
							<Space style={{ width: "100%", justifyContent: "space-between" }}>
								<Button onClick={() => navigate("/login")}>
									{__("Back to Login", "simplyconf")}
								</Button>
								<Button
									type="primary"
									htmlType="submit"
									size="large"
									disabled={!isEmailValid || !isPasswordValid}
								>
									{__("Next Step", "simplyconf")}
								</Button>
							</Space>
						</Form.Item>
					</Form>
				);

			case 1: {
				// Filter custom fields for registration
				const registrationFields = customFields.filter(
					(field) => field.show_in_registration,
				);

				return (
					<Form
						form={customFieldsForm}
						layout="vertical"
						size="large"
						onFinish={(values) => handleStepSubmit(values, 1)}
						autoComplete="off"
						initialValues={formData}
						onValuesChange={(_changed, all) => {
							setFormData((prev) => ({ ...prev, ...all }));
							setCustomFieldsFormValues(all);
						}}
					>
						{customFieldsLoading ? (
							<div style={{ textAlign: "center", padding: "40px" }}>
								<Spin size="large" />
								<div style={{ marginTop: 16 }}>
									{__("Loading additional fields...", "simplyconf")}
								</div>
							</div>
						) : registrationFields.length > 0 ? (
							<>
								<Title level={4}>
									{__("Additional Information", "simplyconf")}
								</Title>
								<Paragraph type="secondary">
									{__(
										"Please provide some additional details to complete your registration.",
										"simplyconf",
									)}
								</Paragraph>

								<ConditionalCustomFields
									fields={registrationFields}
									form={customFieldsForm}
									formValues={customFieldsFormValues}
									namePrefix="" // No prefix - use label
									disabled={false}
									onFieldsChange={setVisibleCustomFields}
									entityType="user"
								/>
							</>
						) : (
							<>
								<Title level={4}>{__("Almost Done!", "simplyconf")}</Title>
								<Paragraph type="secondary">
									{__(
										'No additional information required. Click "Next" to review your registration.',
										"simplyconf",
									)}
								</Paragraph>
							</>
						)}

						<Form.Item style={{ marginTop: 32 }}>
							<Space style={{ width: "100%", justifyContent: "space-between" }}>
								<Button onClick={handlePrevious}>
									{__("Previous", "simplyconf")}
								</Button>
								<Button type="primary" htmlType="submit" size="large">
									{__("Next Step", "simplyconf")}
								</Button>
							</Space>
						</Form.Item>

						{/* Development debug button removed for production */}
					</Form>
				);
			}

			case 2: {
				// Review step
				const reviewCustomFields = customFields.filter(
					(field) => field.show_in_registration,
				);

				return (
					<div>
						<Title level={4}>
							{__("Review Your Registration", "simplyconf")}
						</Title>
						<Paragraph type="secondary">
							{__(
								"Please review your information before submitting your registration.",
								"simplyconf",
							)}
						</Paragraph>

						{/* Progress Indicator */}
						{progress.isActive && (
							<div style={{ marginBottom: "32px" }}>
								<ProgressIndicator
									currentStep={progress.currentStep}
									steps={registrationSteps}
									message={progress.message}
									percentage={progress.percentage}
									showPercentage={false}
									size="small"
								/>
							</div>
						)}

						<div
							style={{
								padding: "16px",
								border: "1px solid #f0f0f0",
								borderRadius: "8px",
								marginBottom: "24px",
							}}
						>
							<Title level={5}>{__("Account Information", "simplyconf")}</Title>
							<p>
								<strong>{__("Email:", "simplyconf")}</strong> {formData.email}
							</p>
							<p>
								<strong>{__("Password:", "simplyconf")}</strong> ••••••••
							</p>
						</div>

						{reviewCustomFields.length > 0 && (
							<div
								style={{
									background: "#f5f5f5",
									padding: "16px",
									borderRadius: "8px",
									marginBottom: "24px",
								}}
							>
								<Title level={5}>
									{__("Additional Information", "simplyconf")}
								</Title>
								{reviewCustomFields.map((field) => {
									const fieldName = String(field.field_id); // Use field_id as key (matches CustomFieldRenderer)
									const fieldValue = formData[fieldName];
									let displayValue = fieldValue;

									if (Array.isArray(fieldValue)) {
										displayValue = fieldValue.join(", ");
									} else if (
										fieldValue === undefined ||
										fieldValue === null ||
										fieldValue === ""
									) {
										displayValue = (
											<em style={{ color: "#999" }}>
												{__("Not provided", "simplyconf")}
											</em>
										);
									}

									return (
										<p key={field.field_id}>
											<strong>{field.label}:</strong> {displayValue}
										</p>
									);
								})}
							</div>
						)}

						<div style={{ marginTop: 32 }}>
							<Space style={{ width: "100%", justifyContent: "space-between" }}>
								<Button onClick={handlePrevious}>
									{__("Previous", "simplyconf")}
								</Button>
								<Button
									type="primary"
									loading={isLoading}
									size="large"
									onClick={() => handleStepSubmit(formData, 2)}
								>
									{__("Create Account", "simplyconf")}
								</Button>
							</Space>
						</div>
					</div>
				);
			}

			default:
				return null;
		}
	};

	// Wait for settings to load before checking registration status
	if (settingsLoading) {
		return (
			<div style={{ textAlign: "center", padding: "60px 0" }}>
				<Spin size="large" />
			</div>
		);
	}

	// Show disabled message if registration is not enabled
	if (!isRegistrationEnabled) {
		return (
			<Card
				style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}
			>
				<Title level={3}>{__("Registration Disabled", "simplyconf")}</Title>
				<Paragraph type="secondary">
					{__(
						"User registration is currently disabled. Please contact the administrator if you need an account.",
						"simplyconf",
					)}
				</Paragraph>
				<Button type="primary" onClick={() => navigate("/login")}>
					{__("Back to Login", "simplyconf")}
				</Button>
			</Card>
		);
	}

	return (
		<Card
			style={{
				maxWidth: 900,
				margin: "0 auto",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
				borderRadius: "8px",
			}}
		>
			<Title
				level={2}
				style={{ textAlign: "center", marginBottom: 32, color: "#262626" }}
			>
				{__("Create Your Account", "simplyconf")}
			</Title>

			{/* Step Indicator */}
			<Steps current={currentStep} style={{ marginBottom: 32 }}>
				{steps.map((step, index) => (
					<Step
						key={index}
						title={step.title}
						description={step.description}
						icon={step.icon}
					/>
				))}
			</Steps>

			{/* Step Content */}
			{renderStepContent()}
		</Card>
	);
};

Register.propTypes = {
	onRegistrationComplete: PropTypes.func,
	onBackToLogin: PropTypes.func,
};

Register.defaultProps = {
	onRegistrationComplete: () => {},
	onBackToLogin: () => {},
};

export default Register;
