import { Button, Empty } from "antd";
import PropTypes from "prop-types";

/**
 * Reusable Empty State component for consistent empty data displays
 * Used throughout the app for tables, lists, and other data containers
 */
const EmptyState = ({
	icon,
	title,
	description,
	actionText,
	onAction,
	imageStyle = {},
	buttonProps = {},
	...props
}) => {
	return (
		<Empty
			image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
			imageStyle={imageStyle}
			description={
				<div style={{ textAlign: "center" }}>
					{title && (
						<h3 style={{ color: "#262626", marginBottom: 8 }}>{title}</h3>
					)}
					{description && (
						<p style={{ color: "#595959", marginBottom: actionText ? 16 : 0 }}>
							{description}
						</p>
					)}
				</div>
			}
			{...props}
		>
			{actionText && onAction && (
				<Button type="primary" onClick={onAction} {...buttonProps}>
					{actionText}
				</Button>
			)}
		</Empty>
	);
};

EmptyState.propTypes = {
	icon: PropTypes.node,
	title: PropTypes.string,
	description: PropTypes.string,
	actionText: PropTypes.string,
	onAction: PropTypes.func,
	imageStyle: PropTypes.object,
	buttonProps: PropTypes.object,
};

export default EmptyState;
