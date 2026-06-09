import { debounce } from "lodash";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

export const useAutoSave = (
	data,
	saveAction,
	delay = 3000,
	onSaveSuccess = null,
) => {
	const [saveStatus, setSaveStatus] = useState("saved"); // 'saving', 'saved', 'error'
	const [lastSaved, setLastSaved] = useState(null);
	const dispatch = useDispatch();
	const isFirstRender = useRef(true);
	const onSaveSuccessRef = useRef(onSaveSuccess);

	// Keep callback ref updated
	useEffect(() => {
		onSaveSuccessRef.current = onSaveSuccess;
	}, [onSaveSuccess]);

	// Debounced save function
	const debouncedSave = useRef(
		debounce(async (dataToSave) => {
			setSaveStatus("saving");
			try {
				const thunkAction = saveAction(dataToSave);
				// If null/undefined, skip save (no-op)
				if (!thunkAction) {
					setSaveStatus("saved");
					return;
				}
				const result = await dispatch(thunkAction).unwrap();
				setSaveStatus("saved");
				setLastSaved(new Date());
				// Also save to localStorage as backup
				localStorage.setItem("draft_backup", JSON.stringify(dataToSave));
				// Call success callback if provided
				if (onSaveSuccessRef.current) {
					onSaveSuccessRef.current(result);
				}
			} catch (error) {
				setSaveStatus("error");
				console.error("Auto-save failed:", error);
			}
		}, delay),
	).current;

	useEffect(() => {
		// Skip first render
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		// Trigger auto-save when data changes
		if (data) {
			debouncedSave(data);
		}

		// Cleanup
		return () => {
			debouncedSave.cancel();
		};
	}, [data, debouncedSave]);

	return { saveStatus, lastSaved };
};
