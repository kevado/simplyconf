import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "@utils/axios";
import { addLoadingCases, baseInitialState } from "./helpers";

export const getTracks = createAsyncThunk(
	"tracks/getAll",
	async (eventId, { rejectWithValue }) => {
		try {
			const { data } = await axios.get(`/tracks?event_id=${eventId}`);
			return data;
		} catch (error) {
			return rejectWithValue(error.response?.data?.message || error.message);
		}
	},
);

export const createTrack = createAsyncThunk(
	"tracks/create",
	async (payload, { dispatch, getState }) => {
		const eventId = getState().events.globalId;
		await axios.post("/tracks", { ...payload, event_id: eventId });
		dispatch(getTracks(eventId));
	},
);

export const updateTrack = createAsyncThunk(
	"tracks/update",
	async ({ id, payload }, { dispatch, getState }) => {
		const eventId = getState().events.globalId;
		await axios.put(`/tracks/${id}`, payload);
		dispatch(getTracks(eventId));
	},
);

export const deleteTrack = createAsyncThunk(
	"tracks/delete",
	async (id, { dispatch, getState }) => {
		const eventId = getState().events.globalId;
		await axios.delete(`/tracks/${id}`);
		dispatch(getTracks(eventId));
	},
);

const trackSlice = createSlice({
	name: "tracks",
	initialState: {
		...baseInitialState,
		tracks: [],
	},
	reducers: {
		clearTracks(state) {
			state.tracks = [];
		},
	},
	extraReducers: (builder) => {
		addLoadingCases(builder, getTracks, (state, action) => {
			state.tracks = action.payload;
		});
	},
});

export const { clearTracks } = trackSlice.actions;
export default trackSlice.reducer;
