import { useAutoSave } from "@hooks/useAutoSave";
import { useTerminology } from "@hooks/useTerminology";
import {
	createAbstract,
	getAbstractById,
	getAbstracts,
	selectUserAbstractsByEvent,
	updateAbstract,
} from "@state/abstractSlice";
import { fetchAttachments, selectAttachments } from "@state/attachmentSlice";
import { fetchCustomFields } from "@state/customFieldsSlice";
import { changeGlobalEvent } from "@state/eventSlice";
import {
	getBooleanSetting,
	getSettingByNameAndCategory,
	getSettings,
} from "@state/settingSlice";
import {
	fetchInitialStatus,
	fetchStatuses,
	selectInitialStatus,
	selectStatusById,
	selectStatusByName,
} from "@state/statusSlice";
import { getTracks } from "@state/trackSlice";
import { isWordPressAdmin, navigateToSubmissions } from "@utils";
import { showError, showSuccess, showWarning } from "@utils/feedback";
import { __ } from "@wordpress/i18n";
import { Form } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { sprintf } from "sprintf-js";

/**
 * Shared state, selectors, effects, and handlers for abstract form components.
 *
 * @param {object} options
 * @param {number|string} [options.abstractId] - Abstract ID from parent (admin mode).
 */
const useAbstractFormState = ({ abstractId: propAbstractId } = {}) => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { abstractId: paramAbstractId } = useParams();
	const [searchParams] = useSearchParams();

	const abstractId = propAbstractId || paramAbstractId;
	const isEdit = !!abstractId;

	const isAdminMode = useMemo(() => isWordPressAdmin(), []);

	// ── Local state ────────────────────────────────────────────────────────────
	const [current, setCurrent] = useState(0);
	const [form] = Form.useForm();
	const [abstractData, setAbstractData] = useState({});
	const [authors, setAuthors] = useState([]);
	const [loading, setLoading] = useState(false);
	const [initialLoad, setInitialLoad] = useState(true);
	const [draftAbstractId, setDraftAbstractId] = useState(null);
	const draftAbstractIdRef = useRef(null);
	const limitAlertShownRef = useRef(false);
	const [_isSubmitted, setIsSubmitted] = useState(false);
	const [isSavingDraft, setIsSavingDraft] = useState(false);
	const [currentAbstractStatus, setCurrentAbstractStatus] = useState(null);

	// URL-derived
	const eventIdFromUrl = searchParams.get("event_id");
	const isEventPreSelected = eventIdFromUrl && !isEdit;

	// ── Redux selectors ────────────────────────────────────────────────────────
	const eventsLoading = useSelector((state) => state.events.isLoading);
	const globalEventId = useSelector((state) => state.events.globalId);
	const currentEvent = useSelector(
		(state) => state.events.events[state.events.globalId],
	);
	const tracks = useSelector((state) => state.tracks.tracks || []);

	const { getTerm } = useTerminology();

	const customFields = useSelector(
		(state) => state.customFields.abstract || [],
	);
	const authorCustomFields = useSelector(
		(state) => state.customFields.author || [],
	);
	const customFieldsLoading = useSelector(
		(state) => state.customFields.isLoading.abstract,
	);

	const [currentFormValues, setCurrentFormValues] = useState(
		form.getFieldsValue(),
	);
	const [visibleCustomFields, setVisibleCustomFields] = useState([]);

	const customFieldsLoadedRef = useRef(false);
	const formValuesLoadedRef = useRef(false);

	const handleFormValuesChange = useCallback((_changedValues, allValues) => {
		setCurrentFormValues(allValues);
	}, []);

	// Settings selectors
	const settingsLoading = useSelector((state) => state.settings.isLoading);
	const showAttachments = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"show_attachments",
			globalEventId,
		),
	);
	const attachmentPref = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"attachment_pref",
			globalEventId,
		),
	);
	const showAuthor = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"show_author",
			globalEventId,
		),
	);
	const editorMedia = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"editor_media",
			globalEventId,
		),
	);
	const charsCount = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"chars_count",
			globalEventId,
		),
	);
	const submitLimit = useSelector((state) =>
		getSettingByNameAndCategory(
			state,
			"abstract",
			"submit_limit",
			globalEventId,
		),
	);

	// Status selectors — declared before isDraftMode so the memo can reference them
	const draftStatus = useSelector((state) =>
		selectStatusByName(globalEventId, "abstract", "draft")(state),
	);
	const submittedStatus = useSelector((state) =>
		selectStatusByName(globalEventId, "abstract", "submitted")(state),
	);
	const initialStatus = useSelector((state) =>
		selectInitialStatus(globalEventId, "abstract")(state),
	);
	const currentStatusObject = useSelector((state) =>
		selectStatusById(globalEventId, "abstract", currentAbstractStatus)(state),
	);

	// ── Derived booleans ───────────────────────────────────────────────────────
	const isDraftMode = useMemo(() => {
		if (draftAbstractId && draftAbstractId !== 0) return true;
		if (isEdit && currentAbstractStatus && draftStatus?.status_id) {
			return (
				Number.parseInt(currentAbstractStatus, 10) ===
				Number.parseInt(draftStatus.status_id, 10)
			);
		}
		return false;
	}, [draftAbstractId, isEdit, currentAbstractStatus, draftStatus]);

	const isInFinalStatus = currentStatusObject?.is_final === true;
	const canEditFinalStatus = isAdminMode;
	const isEditingLocked = isEdit && isInFinalStatus && !canEditFinalStatus;

	const isAttachmentsEnabled = useMemo(() => {
		if (settingsLoading) return true;
		return getBooleanSetting(showAttachments, false);
	}, [settingsLoading, showAttachments]);

	const isAttachmentsRequired = useMemo(() => {
		if (settingsLoading || !isAttachmentsEnabled) return false;
		return attachmentPref?.value === "required";
	}, [settingsLoading, isAttachmentsEnabled, attachmentPref]);

	const allAttachments = useSelector(selectAttachments);
	const currentAttachments = useMemo(() => {
		const currentId = abstractId || draftAbstractId;
		if (!currentId) return [];
		return allAttachments.filter(
			(a) =>
				a.entity_type === "abstract" &&
				Number.parseInt(a.entity_id, 10) === Number.parseInt(currentId, 10),
		);
	}, [allAttachments, abstractId, draftAbstractId]);

	const isAuthorsEnabled = useMemo(() => {
		if (settingsLoading) return true;
		return getBooleanSetting(showAuthor, false);
	}, [settingsLoading, showAuthor]);

	const useWYSIWYGEditor = useMemo(() => {
		if (settingsLoading) return false;
		return getBooleanSetting(editorMedia, false);
	}, [settingsLoading, editorMedia]);

	const maxCharacterCount = useMemo(() => {
		if (settingsLoading || !charsCount) return null;
		return Number.parseInt(charsCount.value, 10) || null;
	}, [settingsLoading, charsCount]);

	const maxSubmitLimit = useMemo(() => {
		if (settingsLoading || !submitLimit) return null;
		return Number.parseInt(submitLimit.value, 10) || null;
	}, [settingsLoading, submitLimit]);

	// Character/word count state for description
	const [descriptionStats, setDescriptionStats] = useState({
		characters: 0,
		words: 0,
	});

	// ── Auto-save ──────────────────────────────────────────────────────────────
	const [formData, setFormData] = useState({});
	const { saveStatus, lastSaved } = useAutoSave(
		formData,
		(data) => {
			if (!data || Object.keys(data).length === 0) return null;
			// Don't auto-save edits until the abstract's current status is known,
			// otherwise the fallback uses draftStatus and overwrites the real status.
			if (isEdit && !currentAbstractStatus) return null;

			const draftPayload = {
				...data,
				title:
					data.title ||
					`${__("Draft", "simplyconf")} - ${new Date().toLocaleString()}`,
				event_id: globalEventId,
				authors,
				status:
					isEdit && currentAbstractStatus && !isDraftMode
						? Number.parseInt(currentAbstractStatus, 10)
						: Number.parseInt(draftStatus?.status_id, 10) || 1,
			};

			const currentDraftId = draftAbstractIdRef.current;
			if (currentDraftId === -1) return null;

			const targetId = currentDraftId || abstractId;

			if (targetId) {
				return updateAbstract({ absId: targetId, payload: draftPayload });
			}

			if (!isEdit) {
				draftAbstractIdRef.current = -1;
				setDraftAbstractId(-1);
				return createAbstract({ payload: draftPayload });
			}

			return null;
		},
		3000,
		(result) => {
			if (!isEdit && draftAbstractIdRef.current === -1) {
				const newAbstractId =
					result?.result || Object.keys(result?.entities?.abstracts || {})[0];
				if (newAbstractId) {
					const parsedId = Number.parseInt(newAbstractId, 10);
					draftAbstractIdRef.current = parsedId;
					setDraftAbstractId(parsedId);
				}
			}
		},
	);

	// ── Submit-limit check ─────────────────────────────────────────────────────
	const userAbstracts = useSelector((state) =>
		selectUserAbstractsByEvent(state, globalEventId),
	);

	// ── Effects ────────────────────────────────────────────────────────────────
	useEffect(() => {
		const id = searchParams.get("event_id");
		if (id && !isEdit) {
			dispatch(changeGlobalEvent(Number.parseInt(id, 10)));
		}
	}, [searchParams, dispatch, isEdit]);

	useEffect(() => {
		if (globalEventId) {
			dispatch(getSettings(globalEventId));
		}
	}, [dispatch, globalEventId]);

	useEffect(() => {
		if (globalEventId && !isAdminMode) {
			dispatch(getAbstracts(globalEventId));
		}
	}, [dispatch, globalEventId, isAdminMode]);

	useEffect(() => {
		if (
			!isEdit &&
			!isAdminMode &&
			globalEventId &&
			maxSubmitLimit &&
			userAbstracts.length > 0
		) {
			if (
				userAbstracts.length >= maxSubmitLimit &&
				!limitAlertShownRef.current
			) {
				limitAlertShownRef.current = true;
				showError(
					sprintf(
						__(
							"You have reached the maximum submission limit of %d %s for this event.",
							"simplyconf",
						),
						maxSubmitLimit,
						getTerm("abstract", maxSubmitLimit),
					),
				);
				setTimeout(() => {
					navigate("/submissions");
				}, 2000);
			}
		}
	}, [
		isEdit,
		isAdminMode,
		globalEventId,
		maxSubmitLimit,
		userAbstracts.length,
		navigate,
		getTerm,
	]);

	useEffect(() => {
		if (globalEventId) {
			form.setFieldValue("event_id", globalEventId);
		}
	}, [globalEventId, form]);

	useEffect(() => {
		if (globalEventId) {
			dispatch(getTracks(globalEventId));
			dispatch(
				fetchCustomFields({ event_id: globalEventId, usage: "abstract" }),
			);
			dispatch(fetchCustomFields({ event_id: globalEventId, usage: "author" }));
			dispatch(fetchStatuses({ eventId: globalEventId, type: "abstract" }));
			dispatch(
				fetchInitialStatus({ eventId: globalEventId, type: "abstract" }),
			);
		}
	}, [dispatch, globalEventId]);

	useEffect(() => {
		if (isEdit && initialLoad) {
			setLoading(true);
			dispatch(getAbstractById(abstractId))
				.unwrap()
				.then((abs) => {
					const eventId = Number.parseInt(abs.event_id, 10);
					const trackId = Number.parseInt(abs.track_id, 10);

					if (globalEventId !== eventId) {
						dispatch(changeGlobalEvent(eventId));
					}

					setAbstractData({
						event_id: eventId,
						track_id: trackId,
						title: abs.title,
						description: abs.description,
						custom_fields: abs.custom_fields || [],
					});
					setAuthors(abs.authors || []);
					setCurrentAbstractStatus(abs.status);

					const abstractStatus = Number.parseInt(abs.status, 10);
					const draftStatusId = Number.parseInt(draftStatus?.status_id, 10);
					if (abstractStatus === draftStatusId) {
						setDraftAbstractId(abstractId);
					}

					setInitialLoad(false);
					setLoading(false);
				});
		}
	}, [isEdit, abstractId, dispatch, initialLoad, globalEventId, draftStatus]);

	useEffect(() => {
		if (
			isEdit &&
			!initialLoad &&
			!formValuesLoadedRef.current &&
			abstractData.event_id &&
			abstractData.track_id &&
			tracks.length > 0 &&
			globalEventId === abstractData.event_id
		) {
			const trackExists = tracks.some(
				(track) => String(track.track_id) === String(abstractData.track_id),
			);
			const matchingTrack = tracks.find(
				(track) => String(track.track_id) === String(abstractData.track_id),
			);
			const trackIdToSet =
				trackExists && matchingTrack ? matchingTrack.track_id : undefined;

			form.setFieldsValue({
				event_id: abstractData.event_id,
				track_id: trackIdToSet,
				title: abstractData.title,
				description: abstractData.description,
			});
			formValuesLoadedRef.current = true;

			if (!trackExists) {
				console.warn(
					"Track not found in tracks array. User needs to select a valid track:",
					abstractData.track_id,
				);
				showWarning(
					sprintf(
						__(
							"The track previously assigned to this %s no longer exists. Please select a valid track.",
							"simplyconf",
						),
						getTerm("abstract", 1).toLowerCase(),
					),
				);
			}
		}
	}, [
		isEdit,
		initialLoad,
		abstractData.event_id,
		abstractData.track_id,
		abstractData.title,
		abstractData.description,
		tracks,
		globalEventId,
		form,
		getTerm,
	]);

	useEffect(() => {
		if (
			isEdit &&
			!initialLoad &&
			!customFieldsLoadedRef.current &&
			abstractData.event_id &&
			customFields.length > 0 &&
			abstractData.custom_fields?.length > 0
		) {
			const customFieldValues = {};
			abstractData.custom_fields.forEach((cf) => {
				const fieldDef = customFields.find(
					(f) => String(f.field_id) === String(cf.field_id),
				);
				if (fieldDef) {
					customFieldValues[fieldDef.field_id] = cf.value;
				}
			});

			if (Object.keys(customFieldValues).length > 0) {
				form.setFieldsValue(customFieldValues);
				setCurrentFormValues((prev) => ({ ...prev, ...customFieldValues }));
			}

			customFieldsLoadedRef.current = true;
		}
	}, [
		isEdit,
		initialLoad,
		abstractData.event_id,
		abstractData.custom_fields,
		customFields,
		form,
	]);

	useEffect(() => {
		const currentId = abstractId || draftAbstractId;
		if (currentId && globalEventId) {
			dispatch(
				fetchAttachments({
					entityType: "abstract",
					entityId: currentId,
					eventId: globalEventId,
				}),
			);
		}
	}, [dispatch, abstractId, draftAbstractId, globalEventId]);

	useEffect(() => {
		if (visibleCustomFields.length > 0 && customFields.length > 0) {
			setAbstractData((prev) => ({
				...prev,
				custom_fields:
					prev.custom_fields?.filter((cf) =>
						visibleCustomFields.some(
							(visibleField) =>
								String(visibleField.field_id) === String(cf.field_id),
						),
					) || [],
			}));
		}
	}, [visibleCustomFields, customFields]);

	// ── Handlers ───────────────────────────────────────────────────────────────
	const handleStepChange = (step) => {
		if (!isEdit) return;
		if (step >= 1 && !globalEventId) {
			showWarning(
				__("Please ensure an event is selected globally", "simplyconf"),
			);
			return;
		}
		if (step >= 2 && !abstractData.track_id) {
			showWarning(__("Please select a track first", "simplyconf"));
			return;
		}
		setCurrent(step);
	};

	const validateForSubmission = () => {
		const errors = [];

		if (!abstractData.title || abstractData.title.trim() === "") {
			errors.push(
				sprintf(
					__("%s title is required", "simplyconf"),
					getTerm("abstract", 1),
				),
			);
		}

		if (!abstractData.description || abstractData.description.trim() === "") {
			errors.push(
				sprintf(
					__("%s description is required", "simplyconf"),
					getTerm("abstract", 1),
				),
			);
		}

		if (!abstractData.track_id) {
			errors.push(__("Track selection is required", "simplyconf"));
		}

		if (isAuthorsEnabled && authors.length === 0) {
			errors.push(
				sprintf(
					__("At least one %s is required", "simplyconf"),
					getTerm("author", 1).toLowerCase(),
				),
			);
		}

		if (isAttachmentsRequired && currentAttachments.length === 0) {
			errors.push(__("At least one attachment is required", "simplyconf"));
		}

		if (visibleCustomFields.length > 0) {
			visibleCustomFields.forEach((field) => {
				if (field.required) {
					const customFieldValue = abstractData.custom_fields?.find(
						(cf) => String(cf.field_id) === String(field.field_id),
					)?.value;

					const isEmpty =
						customFieldValue == null ||
						customFieldValue === "" ||
						(typeof customFieldValue === "string" &&
							customFieldValue.trim() === "") ||
						(Array.isArray(customFieldValue) && customFieldValue.length === 0);
					if (isEmpty) {
						errors.push(
							sprintf(__("%s is required", "simplyconf"), field.label),
						);
					}
				}
			});
		}

		return errors;
	};

	const handleSaveDraft = async () => {
		try {
			setIsSavingDraft(true);

			const formValues = form.getFieldsValue();
			let currentData = { ...abstractData, ...formValues };

			if (
				visibleCustomFields.length > 0 &&
				Object.keys(formValues).length > 0
			) {
				const custom_fields = visibleCustomFields.map((field) => ({
					field_id: field.field_id,
					value: formValues[field.field_id] ?? formValues[field.name] ?? "",
				}));
				currentData = { ...currentData, custom_fields };
			}

			if (!currentData.title || currentData.title.trim() === "") {
				showWarning(
					__("Please enter a title before saving draft", "simplyconf"),
				);
				return;
			}

			if (!draftStatus?.status_id) {
				showError(
					__(
						"Draft status not found. Please ensure statuses are configured for this event.",
						"simplyconf",
					),
				);
				return;
			}

			const draftStatusId = Number.parseInt(draftStatus.status_id, 10);

			if (isEdit || draftAbstractId) {
				const targetId = abstractId || draftAbstractId;
				await dispatch(
					updateAbstract({
						absId: targetId,
						payload: {
							...currentData,
							event_id: globalEventId,
							authors,
							status: draftStatusId,
						},
					}),
				).unwrap();

				if (!draftAbstractId && isEdit) {
					setDraftAbstractId(abstractId);
				}

				showSuccess(__("Draft saved successfully!", "simplyconf"));
			} else {
				const draftPayload = {
					event_id: globalEventId,
					track_id: currentData.track_id || null,
					title: currentData.title,
					description: currentData.description || "",
					status: draftStatusId,
					authors: authors || [],
					custom_fields: currentData.custom_fields || [],
				};

				const result = await dispatch(
					createAbstract({ payload: draftPayload }),
				).unwrap();

				setDraftAbstractId(result.abstract_id);
				showSuccess(__("Draft saved successfully!", "simplyconf"));
			}
		} catch (_error) {
			showError(__("Failed to save draft. Please try again.", "simplyconf"));
		} finally {
			setIsSavingDraft(false);
		}
	};

	const handleSaveAndExit = async () => {
		try {
			setIsSavingDraft(true);
			await handleSaveDraft();
			navigateToSubmissions(navigate);
		} catch (error) {
			console.error("Manual save failed:", error);
		} finally {
			setIsSavingDraft(false);
		}
	};

	const handleSubmit = async () => {
		// Sync custom field values from the form into abstractData.
		// Only sync if the form actually has custom field values rendered
		// (in wizard mode, fields are on a different step and not in the DOM).
		if (visibleCustomFields.length > 0) {
			const formValues = form.getFieldsValue();
			const hasFieldsInForm = visibleCustomFields.some(
				(field) =>
					formValues[field.field_id] !== undefined ||
					formValues[field.name] !== undefined,
			);
			if (hasFieldsInForm) {
				const custom_fields = visibleCustomFields.map((field) => ({
					field_id: field.field_id,
					value: formValues[field.field_id] ?? formValues[field.name] ?? "",
				}));
				setAbstractData((prev) => ({ ...prev, custom_fields }));
				abstractData.custom_fields = custom_fields;
			}
		}

		const validationErrors = validateForSubmission();

		if (validationErrors.length > 0) {
			showError(
				__("Please fix the following errors before submitting.", "simplyconf"),
				<div>
					{validationErrors.map((error, index) => (
						<div key={index} style={{ marginBottom: "4px" }}>
							• {error}
						</div>
					))}
				</div>,
			);
			return;
		}

		const submittedStatusId = submittedStatus?.status_id
			? Number.parseInt(submittedStatus.status_id, 10)
			: initialStatus?.status_id
				? Number.parseInt(initialStatus.status_id, 10)
				: null;

		if (!submittedStatusId) {
			showError(
				__(
					"No submitted status found. Please configure statuses for this event.",
					"simplyconf",
				),
			);
			return;
		}

		try {
			if (isEdit && !isDraftMode) {
				await dispatch(
					updateAbstract({
						absId: abstractId,
						payload: {
							...abstractData,
							event_id: globalEventId,
							authors,
							status: currentAbstractStatus,
						},
					}),
				).unwrap();
				showSuccess(__("Abstract updated successfully!", "simplyconf"));
			} else if (isEdit && isDraftMode) {
				await dispatch(
					updateAbstract({
						absId: abstractId,
						payload: {
							...abstractData,
							event_id: globalEventId,
							authors,
							status: submittedStatusId,
						},
					}),
				).unwrap();
				setIsSubmitted(true);
				setCurrentAbstractStatus(submittedStatusId);
				showSuccess(__("Draft submitted successfully!", "simplyconf"));
			} else if (draftAbstractId) {
				await dispatch(
					updateAbstract({
						absId: draftAbstractId,
						payload: {
							...abstractData,
							event_id: globalEventId,
							authors,
							status: submittedStatusId,
						},
					}),
				).unwrap();
				setIsSubmitted(true);
				setCurrentAbstractStatus(submittedStatusId);
				showSuccess(__("Abstract submitted successfully!", "simplyconf"));
			} else {
				await dispatch(
					createAbstract({
						payload: {
							...abstractData,
							event_id: globalEventId,
							authors,
							status: submittedStatusId,
						},
					}),
				).unwrap();
				setIsSubmitted(true);
				showSuccess(__("Abstract submitted successfully!", "simplyconf"));
			}

			navigateToSubmissions(
				navigate,
				isAdminMode ? "abstracts" : "submissions",
			);
		} catch (_error) {
			showError(
				isEdit
					? __("Update failed", "simplyconf")
					: __("Submission failed", "simplyconf"),
			);
		}
	};

	return {
		// IDs and modes
		abstractId,
		isEdit,
		isAdminMode,
		isEventPreSelected,

		// Step navigation
		current,
		setCurrent,

		// Form
		form,

		// Abstract data
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
		currentAbstractStatus,
		descriptionStats,
		setDescriptionStats,
		formData,
		setFormData,

		// Custom fields
		currentFormValues,
		visibleCustomFields,
		setVisibleCustomFields,
		customFields,
		authorCustomFields,
		customFieldsLoading,

		// Event / tracks
		globalEventId,
		currentEvent,
		eventsLoading,
		tracks,

		// Settings
		settingsLoading,
		isAttachmentsEnabled,
		isAttachmentsRequired,
		isAuthorsEnabled,
		useWYSIWYGEditor,
		maxCharacterCount,
		maxSubmitLimit,

		// Status
		draftStatus,
		submittedStatus,
		initialStatus,
		currentStatusObject,
		isEditingLocked,

		// Attachments
		currentAttachments,

		// Auto-save
		saveStatus,
		lastSaved,

		// Submit-limit
		userAbstracts,

		// Handlers
		handleStepChange,
		handleSaveDraft,
		handleSaveAndExit,
		handleSubmit,
		validateForSubmission,
		handleFormValuesChange,

		// Terminology
		getTerm,

		// Navigation
		navigate,
	};
};

export default useAbstractFormState;
