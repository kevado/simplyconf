import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import EventService from '@services/events';
import { normalize, schema } from 'normalizr';

const event = new schema.Entity('events', undefined, {
	idAttribute: ({ event_id }) => event_id,
});

const initialState = {
	events: {},
	eventIds: [],
	eventId: null,
	// eslint-disable-next-line no-undef
	globalId: Number.parseInt(simplyconf.eventId, 10),
	isLoading: false,
	hasError: false,
	errorMessage: '',
};

export const getEvents = createAsyncThunk(
	'events/getEvents',
	async (_, { rejectWithValue }) => {
		try {
			const events = await EventService.getAll();
			const normalized = normalize(events, [event]);
			return normalized;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

export const getEventById = createAsyncThunk(
	'events/getEventById',
	async (eventId, { rejectWithValue }) => {
		try {
			const event = await EventService.getById(eventId);
			return event;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

export const createEvent = createAsyncThunk(
	'events/create',
	async (payload, { dispatch, rejectWithValue }) => {
		try {
			const event = await EventService.create(payload);
			dispatch(getEvents());
			return event;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

export const updateEvent = createAsyncThunk(
	'events/update',
	async ({ eventId, payload }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await EventService.update(eventId, payload);
			dispatch(getEvents());
			return updated;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

export const setDefaultEvent = createAsyncThunk(
	'events/default',
	async ({ eventId }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await EventService.setDefault(eventId);
			dispatch(getEvents());
			return updated;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

export const deleteEvent = createAsyncThunk(
	'events/remove',
	async (eventId, { dispatch, getState, rejectWithValue }) => {
		try {
			const affected = await EventService.delete(eventId);
			const { events } = await dispatch(getEvents()).unwrap();
			// If the deleted event was the active one, switch to the default
			// (or first remaining) event
			const state = getState();
			if (state.events.globalId === eventId && events) {
				const remaining = Object.values(events);
				const next = remaining.find((e) => e.default === 1) || remaining[0];
				if (next) {
					dispatch(changeGlobalEvent(next.event_id));
				}
			}
			return affected;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

export const updateEventStatus = createAsyncThunk(
	'events/updateStatus',
	async ({ eventId, status }, { dispatch, rejectWithValue }) => {
		try {
			const updated = await EventService.updateStatus(eventId, status);
			dispatch(getEvents());
			return updated;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	}
);

// Change global event and clear all event-specific data
export const changeGlobalEvent = createAsyncThunk(
	'events/changeGlobalEvent',
	async (newEventId, { dispatch }) => {
		// Import the clear actions dynamically to avoid circular dependencies
		const { clearAbstracts } = await import('./abstractSlice');
		const { clearReviews } = await import('simplyconf-reviews/state/reviewSlice');
		const { clearTracks } = await import('./trackSlice');
		const { clearSessions } = await import('simplyconf-schedules/state/sessionSlice');
		const { clearUsers } = await import('./userSlice');
		const { clearCustomFields } = await import('./customFieldsSlice');

		// Clear all event-specific data first
		dispatch(clearAbstracts());
		dispatch(clearReviews());
		dispatch(clearTracks());
		dispatch(clearSessions());
		dispatch(clearUsers());
		dispatch(clearCustomFields());

		// Then set the new global event ID
		return newEventId;
	}
);

const eventSlice = createSlice({
	name: 'events',
	initialState,
	reducers: {
		setEventId(state, action) {
			state.eventId = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getEvents.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getEvents.fulfilled, (state, action) => {
				state.events = action.payload.entities.events;
				state.eventIds = action.payload.result;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(getEvents.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(getEventById.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getEventById.fulfilled, (state, action) => {
				state.events[action.payload.event_id] = action.payload;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(getEventById.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(createEvent.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(createEvent.fulfilled, (state, action) => {
				state.events[action.payload.event_id] = action.payload;
				state.eventIds.push(action.payload.event_id);
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(createEvent.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(updateEvent.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(updateEvent.fulfilled, (state, action) => {
				if (!state.events) state.events = {};
				state.events[action.payload.event_id] = action.payload;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(updateEvent.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(setDefaultEvent.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(setDefaultEvent.fulfilled, (state, action) => {
				if (!state.events) state.events = {};
				state.events[action.payload.event_id] = action.payload;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(setDefaultEvent.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(deleteEvent.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(deleteEvent.fulfilled, (state, action) => {
				const { [action.meta.arg]: removed, ...remaining } = state.events;
				state.events = remaining;
				state.eventIds = state.eventIds.filter((id) => id !== action.meta.arg);
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(deleteEvent.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(updateEventStatus.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(updateEventStatus.fulfilled, (state, action) => {
				state.events[action.payload.event_id] = action.payload;
				state.isLoading = false;
				state.hasError = false;
				state.errorMessage = '';
			})
			.addCase(updateEventStatus.rejected, (state, action) => {
				state.hasError = true;
				state.isLoading = false;
				state.errorMessage =
					action.payload || action.error?.message || 'An error occurred';
			})
			.addCase(changeGlobalEvent.fulfilled, (state, action) => {
				state.globalId = action.payload;
			})
			.addCase(changeGlobalEvent.rejected, (state, action) => {
				state.hasError = true;
				state.errorMessage =
					action.payload ||
					action.error?.message ||
					'Failed to change global event';
			});
	},
});

export const { setEventId } = eventSlice.actions;
export default eventSlice.reducer;
