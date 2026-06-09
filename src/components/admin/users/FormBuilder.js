import CustomFieldsAdmin from "@shared/customFields/CustomFieldsAdmin";
import { __ } from "@wordpress/i18n";
import { Space } from "antd";
import { useSelector } from "react-redux";

const FormBuilder = () => {
	const eventId = useSelector((state) => state.events.globalId);

	return (
		<Space direction="vertical" size="middle" style={{ display: "flex" }}>
			<CustomFieldsAdmin
				eventId={eventId}
				usage="user"
				title={__("User Custom Fields", "simplyconf")}
			/>
		</Space>
	);
};

export default FormBuilder;
