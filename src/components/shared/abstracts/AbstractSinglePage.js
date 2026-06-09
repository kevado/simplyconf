import { CheckCircleOutlined, FileAddOutlined } from "@ant-design/icons";
import useAbstractFormState from "@hooks/useAbstractFormState";
import AuthorManagement from "@shared/abstracts/AuthorManagement";
import DocumentsStep from "@shared/attachments/DocumentsStep";
import ConditionalCustomFields from "@shared/customFields/ConditionalCustomFields";
import SaveStatusIndicator from "@shared/SaveStatusIndicator";
import { getPlainTextFromHTML, getWordCount, WYSIWYGEditor } from "@utils";
import { showError } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import {
	Alert,
	Button,
	Card,
	Col,
	Form,
	Input,
	Row,
	Select,
	Space,
	Tag,
	Typography,
} from "antd";
import PropTypes from "prop-types";
import { sprintf } from "sprintf-js";

const { Option } = Select;
const { Title, Text } = Typography;

// Strip HTML for plain textarea display
const stripHtmlTags = (html) => {
	if (!html) return "";
	return html.replace(/<[^>]*>/g, "");
};

const AbstractSinglePage = ({ abstractId: propAbstractId }) => {
	const {
		abstractId,
		isEdit,
		isAdminMode,
		isEventPreSelected,
		form,
		abstractData,
		setAbstractData,
		authors,
		setAuthors,
		loading,
		draftAbstractId,
		isSavingDraft,
		isDraftMode,
		descriptionStats,
		setDescriptionStats,
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
		isAttachmentsEnabled,
		isAuthorsEnabled,
		useWYSIWYGEditor,
		maxCharacterCount,
		draftStatus,
		isEditingLocked,
		saveStatus,
		lastSaved,
		handleSaveAndExit,
		handleSubmit,
		handleFormValuesChange,
		getTerm,
	} = useAbstractFormState({ abstractId: propAbstractId });

	// ── Page header ────────────────────────────────────────────────────────────
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

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<div data-testid="abstract-submission-single-page">
			<div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
				<SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
			</div>

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

				<Form
					form={form}
					layout="vertical"
					onValuesChange={handleFormValuesChange}
					disabled={isEditingLocked}
				>
					<Row gutter={[24, 0]}>
						{/* ── Left column: title, description, custom fields, attachments ── */}
						<Col xs={24} lg={16}>
							{/* Title */}
							<Card style={{ marginBottom: 16 }}>
								<Text strong style={{ display: "block", marginBottom: 8 }}>
									{sprintf(
										__("%s Title", "simplyconf"),
										getTerm("abstract", 1),
									)}
								</Text>
								<Form.Item
									name="title"
									rules={[{ required: true }, { max: 255 }]}
									style={{ marginBottom: 0 }}
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
							</Card>

							{/* Description */}
							<Card style={{ marginBottom: 16 }}>
								<Text strong style={{ display: "block", marginBottom: 8 }}>
									{sprintf(
										__("%s Description", "simplyconf"),
										getTerm("abstract", 1),
									)}
								</Text>
								<Form.Item
									name="description"
									rules={[{ required: true }]}
									style={{ marginBottom: 0 }}
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
												minHeight={300}
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
													setFormData((prev) => ({
														...prev,
														description: value,
													}));
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
												rows={8}
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
													setFormData((prev) => ({
														...prev,
														description: value,
													}));
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
							</Card>

							{/* Custom fields */}
							{(customFieldsLoading || customFields.length > 0) && (
								<Card style={{ marginBottom: 16 }}>
									<Text strong style={{ display: "block", marginBottom: 12 }}>
										{__("Additional Details", "simplyconf")}
									</Text>
									{customFieldsLoading ? (
										<div>{__("Loading custom fields...", "simplyconf")}</div>
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
								</Card>
							)}

							{/* Attachments */}
							{isAttachmentsEnabled && (
								<Card style={{ marginBottom: 16 }}>
									<Text strong style={{ display: "block", marginBottom: 12 }}>
										{__("Attachments", "simplyconf")}
									</Text>
									<DocumentsStep
										abstractId={Number.parseInt(abstractId, 10)}
										draftAbstractId={Number.parseInt(draftAbstractId, 10)}
										abstractData={abstractData}
										isEdit={isEdit}
										disabled={isEditingLocked}
										/* no onBack/onNext — single page has no steps */
									/>
								</Card>
							)}
						</Col>

						{/* ── Right column: event/track, authors ─────────────────────────── */}
						<Col xs={24} lg={8}>
							{/* Event & track */}
							<Card style={{ marginBottom: 16 }}>
								<Text strong style={{ display: "block", marginBottom: 12 }}>
									{__("Event & Track", "simplyconf")}
								</Text>
								{!isEventPreSelected && (
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
								)}
								{isEventPreSelected && currentEvent && (
									<div style={{ marginBottom: 12, color: "#555" }}>
										<Text strong>{__("Event: ", "simplyconf")}</Text>
										{currentEvent.name}
									</div>
								)}
								<Form.Item
									name="track_id"
									label={getTerm("track", 1)}
									rules={[{ required: true }]}
									style={{ marginBottom: 0 }}
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
							</Card>

							{/* Authors */}
							{isAuthorsEnabled && (
								<Card style={{ marginBottom: 16 }}>
									<Text strong style={{ display: "block", marginBottom: 12 }}>
										{getTerm("author", 2)}
									</Text>
									<AuthorManagement
										authors={authors}
										onAuthorsChange={setAuthors}
										eventId={globalEventId}
										disabled={isEditingLocked}
										customFields={authorCustomFields}
										loading={loading}
									/>
								</Card>
							)}
						</Col>
					</Row>

					{/* ── Footer actions ──────────────────────────────────────────────── */}
					<div
						style={{
							textAlign: "right",
							marginTop: 24,
							paddingTop: 16,
							borderTop: "1px solid #f0f0f0",
						}}
					>
						<Space size="middle">
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
								size="large"
								icon={<CheckCircleOutlined />}
								data-testid="single-page-submit-btn"
								disabled={isEditingLocked}
								style={{ fontWeight: "bold" }}
								onClick={async () => {
									try {
										await form.validateFields();
									} catch (_err) {
										showError(
											__("Please fill in all required fields", "simplyconf"),
										);
										return;
									}
									handleSubmit();
								}}
							>
								{isEdit && !isDraftMode
									? __("Update Abstract", "simplyconf")
									: isEdit && isDraftMode
										? __("Submit Draft", "simplyconf")
										: __("Submit Abstract", "simplyconf")}
							</Button>
						</Space>
					</div>
				</Form>
			</div>
		</div>
	);
};

AbstractSinglePage.propTypes = {
	abstractId: PropTypes.number,
};

export default AbstractSinglePage;
