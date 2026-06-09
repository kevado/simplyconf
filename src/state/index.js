import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import {
	FLUSH,
	PAUSE,
	PERSIST,
	PURGE,
	persistReducer,
	persistStore,
	REGISTER,
	REHYDRATE,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import abstractReducer from "./abstractSlice";
import appearanceSlice from "./appearanceSlice";
import attachmentReducer from "./attachmentSlice";
import authReducer from "./authSlice";
import customFieldsReducer from "./customFieldsSlice";
import dashboardReducer from "./dashboardSlice";
import eventReducer from "./eventSlice";
import featureReducer from "./featureSlice";
import frontendReducer from "./frontendSlice";
import preferenceReducer from "./preferenceSlice";
import settingReducer from "./settingSlice";
import statusReducer from "./statusSlice";
import trackReducer from "./trackSlice";
import userReducer from "./userSlice";

/**
 * Create a placeholder reducer for an addon
 * This allows addons to register their reducers dynamically via window.simplyconf
 *
 * @param {string} addonName - Name of the addon (e.g., 'reviews', 'emails')
 * @param {object} initialState - Initial state structure for the addon
 * @returns {function} Reducer function
 */

const createAddonPlaceholder = (addonName, initialState = {}) => {
	return (state = initialState, action = {}) => {
		// Check if the addon has injected a reducer
		if (
			typeof window !== "undefined" &&
			window.simplyconf?.[`${addonName}Reducer`]
		) {
			return window.simplyconf[`${addonName}Reducer`](state, action);
		}
		return state;
	};
};

// Reviews addon placeholder
const reviewReducer = createAddonPlaceholder("reviews", {
	entities: {},
	entityIds: [],
	loading: false,
	error: null,
	currentReview: null,
	currentReviewLoading: false,
	statistics: {
		total: 0,
		pending: 0,
		completed: 0,
		averageScore: 0,
	},
	filters: {
		search: "",
		status: null,
	},
});

// Track Chairs addon placeholder (part of reviews addon)
const trackChairsReducer = createAddonPlaceholder("trackChairs", {
	trackChairs: {},
	userTracks: [],
	isLoading: false,
	error: null,
});

// Emails addon placeholder
const emailReducer = createAddonPlaceholder("emails", {
	entities: {},
	entityIds: [],
	loading: false,
	error: null,
	currentEmail: null,
	statistics: {
		total: 0,
		sent: 0,
		pending: 0,
		failed: 0,
	},
});

// Email logs addon placeholder
const emailLogReducer = createAddonPlaceholder("emailLogs", {
	entities: {},
	entityIds: [],
	loading: false,
	error: null,
	filters: {
		search: "",
		status: null,
		dateRange: null,
	},
});

// Sessions addon placeholder (for schedules)
const sessionReducer = createAddonPlaceholder("schedules", {
	entities: {},
	entityIds: [],
	loading: false,
	error: null,
	currentSession: null,
	schedule: {
		days: [],
		rooms: [],
		sessions: [],
	},
});

// Placeholder reducer for payments addon (loaded separately)
const paymentsReducer = (
	state = {
		registrations: {
			entities: {},
			entityIds: [],
			loading: false,
			error: null,
			statistics: {
				total: 0,
				confirmed: 0,
				pending: 0,
				cancelled: 0,
				paid: 0,
				unpaid: 0,
				revenue: 0,
			},
			statisticsLoading: false,
			filters: {
				search: "",
				status: null,
				payment_status: null,
			},
			currentRegistration: null,
			currentRegistrationLoading: false,
		},
		registrationTypes: {
			entities: {},
			entityIds: [],
			loading: false,
			error: null,
			availableTypes: [],
			summary: {
				total: 0,
				active: 0,
				archived: 0,
			},
			availability: {},
		},
		settings: {
			settings: {},
			loading: false,
			error: null,
			publicKey: null,
			testConnection: null,
			configuration: {},
		},
		discountCodes: {
			entities: {},
			entityIds: [],
			loading: false,
			error: null,
			validation: {
				validating: false,
				result: null,
				error: null,
				appliedCode: null,
			},
			statistics: {
				total: 0,
				active: 0,
				expired: 0,
				totalUsed: 0,
			},
			filters: {
				search: "",
				status: null,
			},
		},
	},
	action = {},
) => {
	// Check if the addon has injected a reducer
	if (typeof window !== "undefined" && window.simplyconf?.paymentsReducer) {
		return window.simplyconf.paymentsReducer(state, action);
	}
	return state;
};

// Placeholder reducer for reports addon (loaded separately)
const reportsReducer = (
	state = {
		exports: [],
		templates: [],
		loading: false,
		error: null,
	},
	action = {},
) => {
	// Check if the addon has injected a reducer
	if (typeof window !== "undefined" && window.simplyconf?.reportsReducer) {
		return window.simplyconf.reportsReducer(state, action);
	}
	return state;
};

const rootReducer = combineReducers({
	events: eventReducer,
	abstracts: abstractReducer,
	appearance: appearanceSlice,
	reviews: reviewReducer,
	trackChairs: trackChairsReducer,
	users: userReducer,
	settings: settingReducer,
	emails: emailReducer,
	emailLogs: emailLogReducer,
	dashboard: dashboardReducer,
	tracks: trackReducer,
	sessions: sessionReducer,
	frontend: frontendReducer,
	auth: authReducer,
	customFields: customFieldsReducer,
	attachments: attachmentReducer,
	statuses: statusReducer,
	preferences: preferenceReducer,
	payments: paymentsReducer,
	reports: reportsReducer,
	features: featureReducer,
});

const persistConfig = {
	key: "root",
	version: 1,
	storage,
	whitelist: ["session"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
			},
		}),
});

export const persistor = persistStore(store);
