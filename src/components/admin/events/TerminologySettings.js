import { useTerminology } from "@hooks/useTerminology";
import {
	getSettingByNameAndCategory,
	getSettings,
	updateSettingsBatch,
} from "@state/settingSlice";
import { showError, showSuccess } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Button,
	Card,
	Col,
	Divider,
	Form,
	Input,
	Row,
	Space,
	Tag,
	Typography,
} from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text, Paragraph } = Typography;

const TerminologySettings = () => {
	const dispatch = useDispatch();
	const [form] = Form.useForm();
	const { getTerm } = useTerminology();
	const currentEventId = useSelector((state) => state.events.globalId);

	// Ensure settings are loaded when component mounts
	useEffect(() => {
		if (currentEventId) {
			dispatch(getSettings(currentEventId));
		}
	}, [currentEventId, dispatch]);

	// Get the current terminology setting
	const terminologySetting = useSelector((state) =>
		getSettingByNameAndCategory(state, "event", "terminology", currentEventId),
	);

	// Load current terminology values into form when component mounts or terminology changes
	useEffect(() => {
		if (terminologySetting?.value) {
			try {
				const terminology = JSON.parse(terminologySetting.value);
				form.setFieldsValue(terminology);
			} catch (error) {
				console.warn("Failed to parse terminology setting:", error);
			}
		}
	}, [terminologySetting, form]);

	const entities = [
		{
			key: "abstract",
			defaultSingular: __("Abstract", "simplyconf"),
			defaultPlural: __("Abstracts", "simplyconf"),
			description: __("Main submission entity", "simplyconf"),
		},
		{
			key: "author",
			defaultSingular: __("Author", "simplyconf"),
			defaultPlural: __("Authors", "simplyconf"),
			description: __("Submission authors", "simplyconf"),
		},
		{
			key: "reviewer",
			defaultSingular: __("Reviewer", "simplyconf"),
			defaultPlural: __("Reviewers", "simplyconf"),
			description: __("Review system roles", "simplyconf"),
		},
		{
			key: "review",
			defaultSingular: __("Review", "simplyconf"),
			defaultPlural: __("Reviews", "simplyconf"),
			description: __("Peer review entities", "simplyconf"),
		},
		{
			key: "track",
			defaultSingular: __("Track", "simplyconf"),
			defaultPlural: __("Tracks", "simplyconf"),
			description: __("Event categories", "simplyconf"),
		},
		{
			key: "session",
			defaultSingular: __("Session", "simplyconf"),
			defaultPlural: __("Sessions", "simplyconf"),
			description: __("Schedule sessions", "simplyconf"),
		},
		{
			key: "registration",
			defaultSingular: __("Registration", "simplyconf"),
			defaultPlural: __("Registrations", "simplyconf"),
			description: __("Event registrations", "simplyconf"),
		},
		{
			key: "attendee",
			defaultSingular: __("Attendee", "simplyconf"),
			defaultPlural: __("Attendees", "simplyconf"),
			description: __("Event participants", "simplyconf"),
		},
		{
			key: "submission",
			defaultSingular: __("Submission", "simplyconf"),
			defaultPlural: __("Submissions", "simplyconf"),
			description: __("Submission form references", "simplyconf"),
		},
		{
			key: "user",
			defaultSingular: __("User", "simplyconf"),
			defaultPlural: __("Users", "simplyconf"),
			description: __("User account references", "simplyconf"),
		},
	];

	const handleSave = async (values) => {
		if (!currentEventId) {
			console.error("No event selected");
			return;
		}

		try {
			// Convert form values to terminology structure
			const terminology = {};
			Object.keys(values).forEach((entityKey) => {
				if (values[entityKey]) {
					terminology[entityKey] = {
						singular:
							values[entityKey].singular ||
							entities.find((e) => e.key === entityKey)?.defaultSingular,
						plural:
							values[entityKey].plural ||
							entities.find((e) => e.key === entityKey)?.defaultPlural,
					};
				}
			});

			// Prepare the settings update
			const settingsUpdates = [
				{
					event_id: currentEventId,
					category: "event",
					name: "terminology",
					label: "Terminology",
					type: "text",
					value: JSON.stringify(terminology),
				},
			];

			// If terminology setting exists, update it; otherwise it will be created
			if (terminologySetting?.setting_id) {
				settingsUpdates[0].settingId = terminologySetting.setting_id;
			}

			await dispatch(
				updateSettingsBatch({ settingsUpdates, eventId: currentEventId }),
			).unwrap();

			// Show success message
			showSuccess(__("Terminology settings saved successfully", "simplyconf"));
		} catch (error) {
			console.error("Failed to save terminology settings:", error);
			showError(__("Failed to save terminology settings", "simplyconf"));
		}
	};

	const handleReset = () => {
		form.resetFields();
	};

	return (
		<Form
			form={form}
			layout="vertical"
			onFinish={handleSave}
			initialValues={
				{
					// Initialize with empty values - custom terms will be loaded via Redux
				}
			}
		>
			<Card>
				<Title level={3}>{__("Terminology Customization", "simplyconf")}</Title>
				<Paragraph>
					{__(
						"Customize how entities are labeled throughout the system. Leave fields blank to use default translations.",
						"simplyconf",
					)}
				</Paragraph>

				<Divider />

				{entities.map((entity) => (
					<Card key={entity.key} type="inner" style={{ marginBottom: 16 }}>
						<Space direction="vertical" style={{ width: "100%" }}>
							<Space>
								<Tag color="blue">{entity.key}</Tag>
								<Text type="secondary">{entity.description}</Text>
							</Space>

							<Row gutter={16}>
								<Col span={12}>
									<Form.Item
										name={[entity.key, "singular"]}
										label={__("Singular Form", "simplyconf")}
									>
										<Input placeholder={entity.defaultSingular} allowClear />
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item
										name={[entity.key, "plural"]}
										label={__("Plural Form", "simplyconf")}
									>
										<Input placeholder={entity.defaultPlural} allowClear />
									</Form.Item>
								</Col>
							</Row>

							<Text type="secondary">
								{__("Preview:", "simplyconf")} "{getTerm(entity.key, 1)}" / "
								{getTerm(entity.key, 2)}"
							</Text>
						</Space>
					</Card>
				))}

				<Divider />

				<Space>
					<Button type="primary" htmlType="submit">
						{__("Save Terminology", "simplyconf")}
					</Button>
					<Button onClick={handleReset}>
						{__("Reset to Defaults", "simplyconf")}
					</Button>
				</Space>
			</Card>
		</Form>
	);
};

export default TerminologySettings;
