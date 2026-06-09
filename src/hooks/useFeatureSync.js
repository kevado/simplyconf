import { fetchEnabledFeatures } from "@state/featureSlice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useIsSaas } from "./useFeature";

/**
 * Hook to periodically sync features in SaaS mode
 * In SaaS, features can change when admin updates user's plan
 * User may not be aware of the change, so we poll for updates
 *
 * @param {number} intervalMs - Polling interval in milliseconds (default: 60000 = 1 minute)
 *
 * @example
 * // In your main App component
 * useFeatureSync(); // Uses default 1 minute interval
 * useFeatureSync(30000); // Check every 30 seconds
 */
export const useFeatureSync = (intervalMs = 60000) => {
	const dispatch = useDispatch();
	const isSaas = useIsSaas();

	useEffect(() => {
		// Only enable polling in SaaS mode
		if (!isSaas) {
			return;
		}

		// Initial sync on mount
		dispatch(fetchEnabledFeatures());

		// Set up polling interval
		const interval = setInterval(() => {
			dispatch(fetchEnabledFeatures());
		}, intervalMs);

		// Cleanup on unmount
		return () => clearInterval(interval);
	}, [dispatch, isSaas, intervalMs]);
};

export default useFeatureSync;
