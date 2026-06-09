import { CheckCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Progress, Space, Typography } from "antd";
import PropTypes from "prop-types";

const { Text } = Typography;

const ProgressIndicator = ({
	currentStep,
	steps,
	message,
	percentage = null,
	showPercentage = false,
	size = "default",
}) => {
	const getStepIcon = (index) => {
		if (index < currentStep) {
			return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
		}
		if (index === currentStep) {
			return <LoadingOutlined style={{ color: "#1890ff" }} />;
		}
		return null;
	};

	const getStepStatus = (index) => {
		if (index < currentStep) return "finish";
		if (index === currentStep) return "process";
		return "wait";
	};

	const calculatedPercentage =
		percentage !== null
			? percentage
			: Math.round((currentStep / (steps.length - 1)) * 100);

	return (
		<div style={{ width: "100%" }}>
			<Space direction="vertical" size="middle" style={{ width: "100%" }}>
				{/* Progress Bar */}
				<Progress
					percent={calculatedPercentage}
					status={currentStep === steps.length ? "success" : "active"}
					strokeColor={{
						"0%": "#108ee9",
						"100%": "#52c41a",
					}}
					showInfo={showPercentage}
					size={size}
				/>

				{/* Step Indicators */}
				<Space
					size="small"
					style={{ width: "100%", justifyContent: "space-between" }}
				>
					{steps.map((step, index) => (
						<Space
							key={index}
							direction="vertical"
							size="small"
							style={{
								alignItems: "center",
								flex: 1,
								opacity: getStepStatus(index) === "wait" ? 0.5 : 1,
							}}
						>
							{getStepIcon(index)}
							<Text
								type={getStepStatus(index) === "wait" ? "secondary" : "inherit"}
								style={{ fontSize: "12px", textAlign: "center" }}
							>
								{step.label}
							</Text>
						</Space>
					))}
				</Space>

				{/* Current Message */}
				{message && (
					<Text
						type="secondary"
						style={{ fontSize: "14px", textAlign: "center", display: "block" }}
					>
						{message}
					</Text>
				)}
			</Space>
		</div>
	);
};

ProgressIndicator.propTypes = {
	currentStep: PropTypes.number.isRequired,
	steps: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
		}),
	).isRequired,
	message: PropTypes.string,
	percentage: PropTypes.number,
	showPercentage: PropTypes.bool,
	size: PropTypes.oneOf(["default", "small"]),
};

export default ProgressIndicator;
