import { Modal, Space, Typography, theme } from "antd";
import PropTypes from "prop-types";
import { useMemo } from "react";

const StyledModal = ({
	title,
	titleIcon,
	headerExtra,
	open,
	onCancel,
	footer,
	width = 720,
	children,
	gradient,
	"data-testid": testId,
	...props
}) => {
	const { token } = theme.useToken();

	// Generate gradient from primary color if not provided
	const headerGradient = useMemo(() => {
		if (gradient) return gradient;

		// Create gradient from primary color
		const primaryColor = token.colorPrimary;
		return `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`;
	}, [gradient, token.colorPrimary]);

	return (
		<Modal
			wrapProps={testId ? { "data-testid": testId } : undefined}
			title={
				<div
					style={{
						background: headerGradient,
						margin: "-20px -24px 20px -24px",
						padding: "20px 24px",
						borderRadius: "8px 8px 0 0",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Space>
							{titleIcon && (
								<span style={{ fontSize: "18px", color: "#fff" }}>
									{titleIcon}
								</span>
							)}
							<Typography.Title
								level={4}
								style={{ margin: 0, color: "#fff", fontWeight: 600 }}
							>
								{title}
							</Typography.Title>
						</Space>
						{headerExtra && (
							<div style={{ marginRight: 40 }}>{headerExtra}</div>
						)}
					</div>
				</div>
			}
			open={open}
			onCancel={onCancel}
			footer={footer}
			width={width}
			{...props}
		>
			{children}
		</Modal>
	);
};

StyledModal.propTypes = {
	title: PropTypes.string.isRequired,
	titleIcon: PropTypes.node,
	headerExtra: PropTypes.node,
	open: PropTypes.bool.isRequired,
	onCancel: PropTypes.func.isRequired,
	footer: PropTypes.array,
	width: PropTypes.number,
	children: PropTypes.node,
	gradient: PropTypes.string,
};

export default StyledModal;
