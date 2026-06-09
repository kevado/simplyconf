import {
	CalendarOutlined,
	DollarOutlined,
	EnvironmentOutlined,
} from "@ant-design/icons";
import FormSection from "@shared/FormSection";
import { updateEvent } from "@state/eventSlice";
import { __ } from "@wordpress/i18n";
import { Col, DatePicker, Form, Input, Row, Switch } from "antd";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const EditEvent = ({ eventId, onClose }) => {
	const dispatch = useDispatch();
	const event = useSelector((state) => state.events.events[eventId]);
	const [form] = Form.useForm();

	// Reset form when event changes
	useEffect(() => {
		if (event) {
			form.setFieldsValue({
				name: event.name,
				initials: event.initials,
				description: event.description,
				start_date: dayjs(event.start_date),
				end_date: dayjs(event.end_date),
				deadline: dayjs(event.deadline),
				review_deadline: event.review_deadline
					? dayjs(event.review_deadline)
					: null,
				street_address: event.street_address,
				city: event.city,
				state_province: event.state_province,
				postal_code: event.postal_code,
				country: event.country,
				requires_reg_fee:
					event.requires_reg_fee === 1 ||
					event.requires_reg_fee === "1" ||
					event.requires_reg_fee === true,
			});
		}
	}, [event, form]);

	const onFinish = async (formData) => {
		// Format dates to YYYY-MM-DD for backend
		const payload = {
			...formData,
			start_date: formData.start_date?.format("YYYY-MM-DD"),
			end_date: formData.end_date?.format("YYYY-MM-DD"),
			deadline: formData.deadline?.format("YYYY-MM-DD"),
			review_deadline: formData.review_deadline?.format("YYYY-MM-DD") || null,
		};
		await dispatch(updateEvent({ eventId, payload }));
		onClose();
	};

	const onFinishFailed = (errorInfo) => {
		console.log("Failed:", errorInfo);
	};

	return (
		<React.Fragment>
			{event && (
				<Form
					form={form}
					layout="vertical"
					id="edit-event"
					onFinish={onFinish}
					onFinishFailed={onFinishFailed}
				>
					<Row gutter={16}>
						<Col span={18}>
							<Form.Item
								name="name"
								label={__("Name", "simplyconf")}
								rules={[
									{
										required: true,
										message: __("Please enter an event name", "simplyconf"),
									},
								]}
							>
								<Input
									placeholder={__("Please enter an event name", "simplyconf")}
								/>
							</Form.Item>
						</Col>
						<Col span={6}>
							<Form.Item
								name="initials"
								label={__("Initials", "simplyconf")}
								rules={[
									{
										required: true,
										message: __(
											"Please enter the event initials",
											"simplyconf",
										),
									},
								]}
							>
								<Input placeholder={__("Initials", "simplyconf")} />
							</Form.Item>
						</Col>
					</Row>
					<Row gutter={16}>
						<Col span={24}>
							<Form.Item
								name="description"
								label={__("Description", "simplyconf")}
								rules={[
									{
										message: __(
											"please enter a event description",
											"simplyconf",
										),
									},
								]}
							>
								<Input.TextArea
									rows={4}
									placeholder={__("Description", "simplyconf")}
								/>
							</Form.Item>
						</Col>
					</Row>

					<FormSection
						title={__("Event Dates", "simplyconf")}
						icon={<CalendarOutlined />}
					>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									name="start_date"
									label={__("Start Date", "simplyconf")}
									rules={[
										{
											required: true,
											message: __("Please enter the start date", "simplyconf"),
										},
									]}
								>
									<DatePicker style={{ width: "100%" }} />
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									name="end_date"
									label={__("End Date", "simplyconf")}
									rules={[
										{
											required: true,
											message: __("Please enter the end date", "simplyconf"),
										},
									]}
								>
									<DatePicker style={{ width: "100%" }} />
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									name="deadline"
									label={__("Submission Deadline", "simplyconf")}
									rules={[
										{
											required: true,
											message: __("Please enter a deadline", "simplyconf"),
										},
									]}
								>
									<DatePicker style={{ width: "100%" }} />
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									name="review_deadline"
									label={__("Review Deadline", "simplyconf")}
								>
									<DatePicker style={{ width: "100%" }} />
								</Form.Item>
							</Col>
						</Row>
					</FormSection>

					<FormSection
						title={__("Registration Settings", "simplyconf")}
						icon={<DollarOutlined />}
					>
						<Row gutter={16}>
							<Col span={24}>
								<Form.Item
									name="requires_reg_fee"
									label={__(
										"Require Conference Registration Payment",
										"simplyconf",
									)}
									valuePropName="checked"
									tooltip={__(
										"When enabled, accepted authors must complete a paid conference registration managed by the Payments add-on.",
										"simplyconf",
									)}
								>
									<Switch
										checkedChildren={__("Required", "simplyconf")}
										unCheckedChildren={__("Optional", "simplyconf")}
									/>
								</Form.Item>
							</Col>
						</Row>
					</FormSection>

					<FormSection
						title={__("Address Information", "simplyconf")}
						icon={<EnvironmentOutlined />}
					>
						<Row gutter={16}>
							<Col span={16}>
								<Form.Item
									name="street_address"
									label={__("Street Address", "simplyconf")}
								>
									<Input
										placeholder={__("Enter street address", "simplyconf")}
									/>
								</Form.Item>
							</Col>
							<Col span={8}>
								<Form.Item name="city" label={__("City", "simplyconf")}>
									<Input placeholder={__("Enter city", "simplyconf")} />
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={8}>
								<Form.Item
									name="state_province"
									label={__("State/Province", "simplyconf")}
								>
									<Input
										placeholder={__("Enter state or province", "simplyconf")}
									/>
								</Form.Item>
							</Col>
							<Col span={8}>
								<Form.Item
									name="postal_code"
									label={__("Postal Code", "simplyconf")}
								>
									<Input placeholder={__("Enter postal code", "simplyconf")} />
								</Form.Item>
							</Col>
							<Col span={8}>
								<Form.Item name="country" label={__("Country", "simplyconf")}>
									<Input placeholder={__("Enter country", "simplyconf")} />
								</Form.Item>
							</Col>
						</Row>
					</FormSection>
				</Form>
			)}
		</React.Fragment>
	);
};

EditEvent.propTypes = {
	eventId: PropTypes.string.isRequired,
	onClose: PropTypes.func.isRequired,
};

export default EditEvent;
