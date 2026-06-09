import CustomFieldsAdmin from "@shared/customFields/CustomFieldsAdmin";
import { __ } from "@wordpress/i18n";
import { Segmented, Space, Typography, theme } from "antd";
import { useState } from "react";
import { useSelector } from "react-redux";

const { Title } = Typography;

const FormBuilder = () => {
	const { token } = theme.useToken();
	const eventId = useSelector((state) => state.events.globalId);
	const [fieldType, setFieldType] = useState("abstract");

	return (
		<Space direction="vertical" size="middle" style={{ display: "flex" }}>
			<div
				className="simplyconf-page-header"
				style={{
					background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
				}}
			>
				<Title level={3} style={{ margin: 0, color: "#fff" }}>
					{__("Custom Fields", "simplyconf")}
				</Title>
				<p
					style={{
						color: "rgba(255, 255, 255, 0.9)",
						fontSize: "16px",
						marginBottom: 16,
						marginTop: 8,
					}}
				>
					{__(
						"Configure custom fields for abstracts and authors",
						"simplyconf",
					)}
				</p>
				<Segmented
					value={fieldType}
					onChange={setFieldType}
					size="large"
					options={[
						{
							label: __("📝 Abstract Fields", "simplyconf"),
							value: "abstract",
						},
						{ label: __("👥 Author Fields", "simplyconf"), value: "author" },
					]}
					style={{
						background: "rgba(255, 255, 255, 0.9)",
					}}
				/>
			</div>

			<CustomFieldsAdmin
				eventId={eventId}
				usage={fieldType}
				title={
					fieldType === "abstract"
						? __("Abstract Custom Fields", "simplyconf")
						: __("Author Custom Fields", "simplyconf")
				}
			/>
		</Space>
	);
};

export default FormBuilder;
