import { Divider, Space } from "antd";
import PropTypes from "prop-types";

const FormSection = ({ title, icon, children, orientation = "left" }) => {
	return (
		<>
			<Divider orientation={orientation}>
				<Space>
					{icon && (
						<span style={{ fontSize: "14px", color: "#1890ff" }}>{icon}</span>
					)}
					<span style={{ fontSize: "14px", fontWeight: 500 }}>{title}</span>
				</Space>
			</Divider>
			{children}
		</>
	);
};

FormSection.propTypes = {
	title: PropTypes.string.isRequired,
	icon: PropTypes.node,
	children: PropTypes.node.isRequired,
	orientation: PropTypes.oneOf(["left", "center", "right"]),
};

export default FormSection;
