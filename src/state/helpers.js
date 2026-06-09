/**
 * Shared Redux slice helpers
 *
 * Provides a base initial state and a builder helper to eliminate the
 * copy-pasted pending/rejected boilerplate found in every slice.
 *
 * Usage:
 *   import { baseInitialState, addLoadingCases } from './helpers';
 *
 *   const initialState = { ...baseInitialState, items: [] };
 *
 *   extraReducers: (builder) => {
 *     addLoadingCases(builder, fetchItems, (state, action) => {
 *       state.items = action.payload;
 *     });
 *   }
 */

/**
 * Base loading/error state shared by all slices.
 * Spread into each slice's initialState.
 */
export const baseInitialState = {
	isLoading: false,
	hasError: false,
	errorMessage: "",
};

/**
 * Adds standard pending / fulfilled / rejected cases for a thunk.
 *
 * @param {import('@reduxjs/toolkit').ActionReducerMapBuilder} builder
 * @param {import('@reduxjs/toolkit').AsyncThunk} thunk
 * @param {(state: any, action: any) => void} [onFulfilled] - Optional handler for the
 *   fulfilled case. Called after isLoading is set to false, so it only needs to
 *   handle payload assignment.
 */
export function addLoadingCases(builder, thunk, onFulfilled) {
	builder
		.addCase(thunk.pending, (state) => {
			state.isLoading = true;
			state.hasError = false;
			state.errorMessage = "";
		})
		.addCase(thunk.fulfilled, (state, action) => {
			state.isLoading = false;
			if (onFulfilled) onFulfilled(state, action);
		})
		.addCase(thunk.rejected, (state, action) => {
			state.isLoading = false;
			state.hasError = true;
			state.errorMessage =
				action.payload || action.error?.message || "An error occurred";
		});
}
