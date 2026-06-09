import {
	calculatePasswordStrength,
	validatePassword,
} from "@utils/userSettings";
import { __ } from "@wordpress/i18n";
import { Progress, Space, Typography } from "antd";
import { useEffect, useState } from "react";

const { Text } = Typography;

const PasswordStrengthIndicator = ({
	password,
	requirements,
	showValidation = true,
}) => {
	const [strength, setStrength] = useState({
		score: 0,
		label: "Very Weak",
		color: "#ff4d4f",
	});
	const [_validation, setValidation] = useState({ isValid: true, errors: [] });

	useEffect(() => {
		if (password) {
			const strengthResult = calculatePasswordStrength(password, requirements);
			const validationResult = validatePassword(password, requirements);

			setStrength(strengthResult);
			setValidation(validationResult);
		} else {
			setStrength({ score: 0, label: "Very Weak", color: "#ff4d4f" });
			setValidation({ isValid: true, errors: [] });
		}
	}, [password, requirements]);

	// Don't show anything if no password
	if (!password) {
		return null;
	}

	return (
		<div style={{ marginTop: 8 }}>
			<Space direction="vertical" size="small" style={{ width: "100%" }}>
				{/* Strength indicator */}
				<div>
					<Text style={{ fontSize: "12px", color: "#666" }}>
						{__("Password Strength:", "simplyconf")}{" "}
						<Text strong style={{ color: strength.color }}>
							{strength.label}
						</Text>
					</Text>
					<Progress
						percent={Math.min((strength.score / 8) * 100, 100)}
						showInfo={false}
						strokeColor={strength.color}
						size="small"
						style={{ marginTop: 4 }}
					/>
				</div>

				{/* Requirements list */}
				{showValidation && (
					<div>
						<Text
							type="secondary"
							style={{ fontSize: "12px", fontWeight: "bold" }}
						>
							{__("Password Requirements:", "simplyconf")}
						</Text>
						<div style={{ marginTop: 4 }}>
							{requirements.minLength > 0 && (
								<Text
									style={{
										fontSize: "11px",
										display: "block",
										color:
											password.length >= requirements.minLength
												? "#52c41a"
												: "#ff4d4f",
									}}
								>
									• {__("At least", "simplyconf")} {requirements.minLength}{" "}
									{__("characters", "simplyconf")}
								</Text>
							)}
							{requirements.maxLength > 0 && (
								<Text
									style={{
										fontSize: "11px",
										display: "block",
										color:
											password.length <= requirements.maxLength
												? "#52c41a"
												: "#ff4d4f",
									}}
								>
									• {__("At most", "simplyconf")} {requirements.maxLength}{" "}
									{__("characters", "simplyconf")}
								</Text>
							)}
							{requirements.requireUppercase && (
								<Text
									style={{
										fontSize: "11px",
										display: "block",
										color: /[A-Z]/.test(password) ? "#52c41a" : "#ff4d4f",
									}}
								>
									• {__("One uppercase letter", "simplyconf")}
								</Text>
							)}
							{requirements.requireLowercase && (
								<Text
									style={{
										fontSize: "11px",
										display: "block",
										color: /[a-z]/.test(password) ? "#52c41a" : "#ff4d4f",
									}}
								>
									• {__("One lowercase letter", "simplyconf")}
								</Text>
							)}
							{requirements.requireNumbers && (
								<Text
									style={{
										fontSize: "11px",
										display: "block",
										color: /\d/.test(password) ? "#52c41a" : "#ff4d4f",
									}}
								>
									• {__("One number", "simplyconf")}
								</Text>
							)}
							{requirements.requireSymbols && (
								<Text
									style={{
										fontSize: "11px",
										display: "block",
										color: /[!@#$%^&*(),.?":{}|<>]/.test(password)
											? "#52c41a"
											: "#ff4d4f",
									}}
								>
									• {__("One special character", "simplyconf")}
								</Text>
							)}
						</div>
					</div>
				)}
			</Space>
		</div>
	);
};

export default PasswordStrengthIndicator;
