import { CheckCircleOutlined, FileAddOutlined } from "@ant-design/icons";
import useAbstractFormState from "@hooks/useAbstractFormState";
import AbstractView from "@shared/abstracts/AbstractView";
import AuthorManagement from "@shared/abstracts/AuthorManagement";
import DocumentsStep from "@shared/attachments/DocumentsStep";
import ConditionalCustomFields from "@shared/customFields/ConditionalCustomFields";
import SaveStatusIndicator from "@shared/SaveStatusIndicator";
import { updateAbstract } from "@state/abstractSlice";
import { getPlainTextFromHTML, getWordCount, WYSIWYGEditor } from "@utils";
import { showError } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Button,
	Col,
	Divider,
	Form,
	Input,
	Row,
	Select,
	Space,
	Steps,
	Tag,
	Typography,
} from "antd";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { sprintf } from "sprintf-js";

const { Step } = Steps;
const { Option } = Select;
const { Title } = Typography;

// Helper to strip HTML tags for the plain textarea
const stripHtmlTags = (html) => {
	if (!html) return "";
	return html.replace(/<[^>]*>/g, "");
};

const AbstractWizard = ({ abstractId: propAbstractId }) => {
	const dispatch = useDispatch();
	const state = useAbstractFormState({ abstractId: propAbstractId });

	const {
		abstractId,
		isEdit,
		isAdminMode,
		isEventPreSelected,
		current,
		setCurrent,
		form,
		abstractData,
		setAbstractData,
		authors,
		setAuthors,
		loading,
		setLoading,
		draftAbstractId,
		isSavingDraft,
		setIsSavingDraft,
		isDraftMode,
		descriptionStats,
		setDescriptionStats,
		formData,
		setFormData,
		currentFormValues,
		visibleCustomFields,
		setVisibleCustomFields,
		customFields,
		authorCustomFields,
		customFieldsLoading,
		globalEventId,
		currentEvent,
		eventsLoading,
		tracks,
		settingsLoading,
		isAttachmentsEnabled,
		isAuthorsEnabled,
		useWYSIWYGEditor,
		maxCharacterCount,
		draftStatus,
		submittedStatus,
		initialStatus,
		isEditingLocked,
		saveStatus,
		lastSaved,
		handleStepChange,
		handleSaveDraft,
		handleSaveAndExit,
		handleSubmit,
		handleFormValuesChange,
		getTerm,
	} = state;

	// ── Step definitions ────────────────────────────────────────────────────────
	const allSteps = [
		{
			title: __("Event", "simplyconf"),
			content: (
				<Form
					form={form}
					layout="vertical"
					onValuesChange={handleFormValuesChange}
					disabled={isEditingLocked}
				>
					<Form.Item name="event_id" label={__("Event", "simplyconf")}>
						<Select
							disabled
							value={globalEventId}
							placeholder={__("No global event selected", "simplyconf")}
							loading={eventsLoading}
						>
							{globalEventId && (
								<Option key={globalEventId} value={globalEventId}>
									{eventsLoading
										? "Loading event..."
										: currentEvent?.name || `Event ${globalEventId}`}
								</Option>
							)}
						</Select>
					</Form.Item>
					<Form.Item
						name="track_id"
						label={getTerm("track", 1)}
						rules={[{ required: true }]}
					>
						<Select
							data-testid="track-select"
							placeholder={__("Select track", "simplyconf")}
							showSearch
							filterOption={(input, option) =>
								(option?.children ?? "")
									.toLowerCase()
									.includes(input.toLowerCase())
							}
							loading={tracks.length === 0}
							notFoundContent={
								tracks.length === 0
									? __("Loading tracks...", "simplyconf")
									: __("No tracks available", "simplyconf")
							}
							disabled={isEditingLocked}
							onChange={(val) => {
								setAbstractData((prev) => ({ ...prev, track_id: val }));
								setFormData((prev) => ({
									...prev,
									track_id: val,
									event_id: globalEventId,
								}));
							}}
						>
							{Array.isArray(tracks) && tracks.length > 0
								? tracks.map((tr) => (
										<Option key={tr.track_id} value={tr.track_id}>
											{tr.name}
										</Option>
									))
								: null}
						</Select>
					</Form.Item>
					<div style={{ textAlign: "right", marginTop: 16 }}>
						<Space>
							{(!isEdit || isDraftMode) && (
								<Button
									icon={<FileAddOutlined />}
									loading={isSavingDraft}
									type="secondary"
									onClick={handleSaveAndExit}
									disabled={!globalEventId || !draftStatus?.status_id}
								>
									{__("Save & Exit", "simplyconf")}
								</Button>
							)}
							<Button
								type="primary"
								loading={loading}
								data-testid="wizard-next-btn"
								disabled={isEditingLocked}
								onClick={async () => {
									try {
										await form.validateFields();
										const values = form.getFieldsValue();
										const updatedData = {
											...abstractData,
											...values,
											event_id: globalEventId,
										};
										setAbstractData(updatedData);

										if (!isEdit && draftAbstractId) {
											try {
												setLoading(true);
												const draftStatusId =
													Number.parseInt(draftStatus?.status_id, 10) ||
													Number.parseInt(initialStatus?.status_id, 10) ||
													1;
												await dispatch(
													updateAbstract({
														absId: draftAbstractId,
														payload: {
															...updatedData,
															event_id: globalEventId,
															authors,
															status: draftStatusId || 1,
														},
													}),
												).unwrap();
											} catch (_error) {
												// Non-fatal: user can continue
											} finally {
												setLoading(false);
											}
										}

										setCurrent(1);
									} catch (_error) {
										showError(
											__("Please fill in all required fields", "simplyconf"),
										);
									}
								}}
							>
								{__("Next", "simplyconf")}
							</Button>
						</Space>
					</div>
				</Form>
			),
		},
		{
			title: sprintf(__("%s Info", "simplyconf"), getTerm("abstract", 1)),
			content: (
				<Form
					form={form}
					layout="vertical"
					onValuesChange={handleFormValuesChange}
					disabled={isEditingLocked}
				>
					<Form.Item
						name="title"
						label={sprintf(
							__("%s Title", "simplyconf"),
							getTerm("abstract", 1),
						)}
						rules={[{ required: true }, { max: 255 }]}
					>
						<Input
							data-testid="abstract-title-input"
							maxLength={255}
							showCount
							value={abstractData.title || ""}
							onChange={(e) => {
								const value = e.target.value;
								form.setFieldValue("title", value);
								setAbstractData((prev) => ({ ...prev, title: value }));
								setFormData((prev) => ({ ...prev, title: value }));
							}}
						/>
					</Form.Item>
					<Form.Item
						name="description"
						label={sprintf(
							__("%s Description", "simplyconf"),
							getTerm("abstract", 1),
						)}
						rules={[{ required: true }]}
					>
						{useWYSIWYGEditor ? (
							<>
								<WYSIWYGEditor
									value={abstractData.description || ""}
									placeholder={sprintf(
										__("Enter %s description...", "simplyconf"),
										getTerm("abstract", 1).toLowerCase(),
									)}
									disabled={isEditingLocked}
									minHeight={250}
									maxLength={maxCharacterCount}
									showCharCount={true}
									onChange={(value) => {
										const plainText = getPlainTextFromHTML(value);
										setDescriptionStats({
											characters: plainText.length,
											words: getWordCount(value),
										});
										form.setFieldValue("description", value);
										setAbstractData((prev) => ({
											...prev,
											description: value,
										}));
										setFormData((prev) => ({ ...prev, description: value }));
									}}
								/>
								<div
									style={{
										textAlign: "right",
										marginTop: 4,
										fontSize: "12px",
										color: "#666",
									}}
								>
									{descriptionStats.words} {__("words", "simplyconf")} •{" "}
									{descriptionStats.characters}
									{maxCharacterCount ? ` / ${maxCharacterCount}` : ""}{" "}
									{__("characters", "simplyconf")}
								</div>
							</>
						) : (
							<>
								<Input.TextArea
									data-testid="abstract-description-input"
									rows={6}
									value={stripHtmlTags(abstractData.description || "")}
									maxLength={maxCharacterCount}
									onChange={(e) => {
										const value = e.target.value;
										setDescriptionStats({
											characters: value.length,
											words: value
												.trim()
												.split(/\s+/)
												.filter((w) => w.length > 0).length,
										});
										form.setFieldValue("description", value);
										setAbstractData((prev) => ({
											...prev,
											description: value,
										}));
										setFormData((prev) => ({ ...prev, description: value }));
									}}
								/>
								<div
									style={{
										textAlign: "right",
										marginTop: 4,
										fontSize: "12px",
										color: "#666",
									}}
								>
									{descriptionStats.words} {__("words", "simplyconf")} •{" "}
									{descriptionStats.characters}
									{maxCharacterCount ? ` / ${maxCharacterCount}` : ""}{" "}
									{__("characters", "simplyconf")}
								</div>
							</>
						)}
					</Form.Item>
					<div style={{ textAlign: "right", marginTop: 16 }}>
						<Space>
							<Button onClick={() => setCurrent(0)} style={{ marginRight: 8 }}>
								{__("Back", "simplyconf")}
							</Button>
							{(!isEdit || isDraftMode) && (
								<Button
									icon={<FileAddOutlined />}
									loading={isSavingDraft}
									onClick={handleSaveAndExit}
									disabled={!globalEventId || !draftStatus?.status_id}
								>
									{__("Save & Exit", "simplyconf")}
								</Button>
							)}
							<Button
								type="primary"
								data-testid="wizard-next-btn"
								onClick={async () => {
									try {
										await form.validateFields();
										const values = form.getFieldsValue();
										const updatedData = { ...abstractData, ...values };
										setAbstractData(updatedData);
										setCurrent(current + 1);
									} catch (_error) {
										showError(
											__("Please fill in all required fields", "simplyconf"),
										);
									}
								}}
							>
								{__("Next", "simplyconf")}
							</Button>
						</Space>
					</div>
				</Form>
			),
		},
		{
			title: __("Additional Details", "simplyconf"),
			content: (
				<Form
					form={form}
					layout="vertical"
					onValuesChange={handleFormValuesChange}
					disabled={isEditingLocked}
				>
					{customFieldsLoading ? (
						<div>{__("Loading custom fields...", "simplyconf")}</div>
					) : customFields.length === 0 ? (
						<div
							style={{ padding: "20px", textAlign: "center", color: "#666" }}
						>
							{__(
								"No additional details are required for this event.",
								"simplyconf",
							)}
						</div>
					) : (
						<ConditionalCustomFields
							fields={customFields}
							form={form}
							formValues={currentFormValues}
							namePrefix=""
							disabled={isEditingLocked}
							onFieldsChange={setVisibleCustomFields}
							entityType="abstract"
							entityId={abstractId || draftAbstractId}
						/>
					)}
					<div style={{ textAlign: "right", marginTop: 16 }}>
						<Space>
							<Button onClick={() => setCurrent(1)} style={{ marginRight: 8 }}>
								{__("Back", "simplyconf")}
							</Button>
							{(!isEdit || isDraftMode) && (
								<Button
									icon={<FileAddOutlined />}
									loading={isSavingDraft}
									onClick={handleSaveAndExit}
									disabled={!globalEventId || !draftStatus?.status_id}
								>
									{__("Save & Exit", "simplyconf")}
								</Button>
							)}
							<Button
								type="primary"
								data-testid="wizard-next-btn"
								onClick={async () => {
									try {
										await form.validateFields();
									} catch (_error) {
										showError(
											__("Please fill in all required fields", "simplyconf"),
										);
										return;
									}

									const values = form.getFieldsValue();
									const custom_fields = visibleCustomFields.map((field) => ({
										field_id: field.field_id,
										value: values[field.field_id] ?? values[field.name] ?? "",
									}));

									setAbstractData((prev) => ({ ...prev, custom_fields }));
									setCurrent(current + 1);
								}}
							>
								{__("Next", "simplyconf")}
							</Button>
						</Space>
					</div>
				</Form>
			),
		},
		{
			title: getTerm("author", 2),
			content: (
				<div>
					<AuthorManagement
						authors={authors}
						onAuthorsChange={setAuthors}
						eventId={globalEventId}
						disabled={isEditingLocked}
						customFields={authorCustomFields}
						loading={loading}
					/>
					<div style={{ textAlign: "right", marginTop: 16 }}>
						<Space>
							<Button
								onClick={() => setCurrent(current - 1)}
								style={{ marginRight: 8 }}
								disabled={isEditingLocked}
							>
								{__("Back", "simplyconf")}
							</Button>
							{(!isEdit || isDraftMode) && (
								<Button
									icon={<FileAddOutlined />}
									loading={isSavingDraft}
									onClick={handleSaveAndExit}
									disabled={
										!globalEventId || !draftStatus?.status_id || isEditingLocked
									}
								>
									{__("Save & Exit", "simplyconf")}
								</Button>
							)}
							<Button
								type="primary"
								data-testid="wizard-next-btn"
								disabled={isEditingLocked}
								onClick={() => {
									if (authors.length === 0) {
										showError(
											`At least one ${getTerm("author", 1).toLowerCase()} is required`,
										);
										return;
									}
									setCurrent(current + 1);
								}}
							>
								{__("Next", "simplyconf")}
							</Button>
						</Space>
					</div>
				</div>
			),
		},
		{
			title: "Attachments",
			content: (
				<DocumentsStep
					abstractId={Number.parseInt(abstractId, 10)}
					draftAbstractId={Number.parseInt(draftAbstractId, 10)}
					abstractData={abstractData}
					isEdit={isEdit}
					onBack={() => setCurrent(current - 1)}
					onNext={() => setCurrent(current + 1)}
					disabled={isEditingLocked}
				/>
			),
		},
		{
			title: getTerm("review", 1),
			content: (
				<div>
					{abstractId || draftAbstractId ? (
						<AbstractView
							abstractId={Number.parseInt(abstractId || draftAbstractId, 10)}
							showNavigation={false}
							showActions={false}
							context={isAdminMode ? "admin" : "frontend"}
							submissionData={{ ...abstractData, authors }}
						/>
					) : (
						<Alert
							message={__("Unable to load preview", "simplyconf")}
							description={__(
								"Please complete the previous steps to see a preview of your submission.",
								"simplyconf",
							)}
							type="warning"
							showIcon
							style={{ marginBottom: 24 }}
						/>
					)}

					<Divider style={{ margin: "32px 0" }} />

					<div style={{ textAlign: "center", paddingTop: 16 }}>
						<Space size="large" data-testid="review-actions">
							{(!isEdit || isDraftMode) && (
								<Button
									icon={<FileAddOutlined />}
									size="large"
									loading={isSavingDraft}
									onClick={handleSaveAndExit}
									disabled={!globalEventId || !draftStatus?.status_id}
									style={{
										minWidth: "140px",
										height: "48px",
										fontSize: "16px",
									}}
								>
									{__("Save & Exit", "simplyconf")}
								</Button>
							)}
							<Button
								type="primary"
								size="large"
								icon={<CheckCircleOutlined />}
								data-testid="wizard-submit-btn"
								disabled={isEditingLocked}
								style={{
									minWidth: "160px",
									height: "48px",
									fontSize: "16px",
									fontWeight: "bold",
								}}
								onClick={handleSubmit}
							>
								{isEdit && !isDraftMode
									? __("Update Abstract", "simplyconf")
									: isEdit && isDraftMode
										? __("Submit Draft", "simplyconf")
										: __("Submit Abstract", "simplyconf")}
							</Button>
						</Space>
					</div>
				</div>
			),
		},
	];

	// ── Filter steps based on settings ─────────────────────────────────────────
	const steps = allSteps.filter((_step, index) => {
		if (index === 0 && isEventPreSelected) return false;
		if (index === 3 && !isAuthorsEnabled) return false;
		if (index === 4 && !isAttachmentsEnabled) return false;
		return true;
	});

	// Clamp current to valid range if steps array shrinks
	useEffect(() => {
		if (steps.length > 0 && current >= steps.length) {
			setCurrent(steps.length - 1);
		}
	}, [steps.length, current, setCurrent]);

	// ── Page header helpers ─────────────────────────────────────────────────────
	const renderHeader = () => (
		<div
			style={{
				marginBottom: 32,
				borderBottom: "1px solid #f0f0f0",
				paddingBottom: 24,
			}}
		>
			<Row justify="space-between" align="middle">
				<Col>
					<Title level={2} style={{ margin: 0 }}>
						{isEdit
							? sprintf(__("Edit %s", "simplyconf"), getTerm("abstract", 1))
							: sprintf(
									__("Create New %s", "simplyconf"),
									getTerm("abstract", 1),
								)}
					</Title>
					{isEventPreSelected && currentEvent && (
						<div style={{ color: "#666", marginTop: 8, fontSize: "16px" }}>
							{sprintf(__("Event: %s", "simplyconf"), currentEvent.name)}
						</div>
					)}
					{isEdit && abstractData.title && (
						<div style={{ color: "#666", marginTop: 8, fontSize: "16px" }}>
							{abstractData.title}
						</div>
					)}
				</Col>
			</Row>
			{!isEdit && (
				<div style={{ marginTop: 16 }}>
					{draftAbstractId ? (
						<Tag color="blue" icon={<FileAddOutlined />}>
							{sprintf(
								__(
									"Draft Saved (ID: %d) - Only visible to you until submitted",
									"simplyconf",
								),
								draftAbstractId,
							)}
						</Tag>
					) : (
						<Tag color="default">{__("No Draft Saved", "simplyconf")}</Tag>
					)}
				</div>
			)}
			{isEdit && (
				<div style={{ marginTop: 16 }}>
					<Space>
						{isDraftMode ? (
							<Tag color="blue" icon={<FileAddOutlined />}>
								{__("Editing Draft (Not yet submitted)", "simplyconf")}
							</Tag>
						) : (
							<Tag color="green" icon={<CheckCircleOutlined />}>
								{sprintf(
									__("Editing Submitted %s", "simplyconf"),
									getTerm("abstract", 1),
								)}
							</Tag>
						)}
						<Tag color="default">
							{sprintf(__("ID: %s", "simplyconf"), abstractId)}
						</Tag>
					</Space>
				</div>
			)}
		</div>
	);

	// ── Render ──────────────────────────────────────────────────────────────────
	return (
		<div data-testid="abstract-submission-wizard">
			<div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
				<SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
			</div>

			<div>
				<div style={{ padding: "32px 24px" }}>
					{renderHeader()}

					{isEditingLocked && (
						<Alert
							message={sprintf(
								__("%s Locked", "simplyconf"),
								getTerm("abstract", 1),
							)}
							description={__(
								"Modifications are not permitted at this time.",
								"simplyconf",
							)}
							type="warning"
							showIcon
							style={{ marginBottom: 24 }}
						/>
					)}

					<Steps
						current={current}
						onChange={handleStepChange}
						type={isEdit ? "navigation" : "default"}
						style={{ cursor: isEdit ? "pointer" : "default" }}
					>
						{steps.map((item, index) => (
							<Step
								key={item.title}
								title={item.title}
								style={{
									cursor: isEdit ? "pointer" : "default",
									opacity: isEdit ? 1 : index <= current ? 1 : 0.5,
								}}
							/>
						))}
					</Steps>
					<div style={{ marginTop: 32 }}>{steps[current]?.content}</div>
				</div>
			</div>
		</div>
	);
};

AbstractWizard.propTypes = {
	abstractId: PropTypes.number,
};

export default AbstractWizard;
