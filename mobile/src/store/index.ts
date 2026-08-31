/**
 * Redux Store Configuration
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Slices
import authReducer from './slices/authSlice';
import inspectionsReducer from './slices/inspectionsSlice';
import employersReducer from './slices/employersSlice';
import workersReducer from './slices/workersSlice';
import offlineReducer from './slices/offlineSlice';
import settingsReducer from './slices/settingsSlice';
import syncReducer from './slices/syncSlice';

// Persist middleware
const persistMiddleware = (store: any) => (next: any) => async (action: any) => {
  const result = next(action);

  // Persist specific slices to AsyncStorage
  if (action.type?.startsWith('settings/') || action.type?.startsWith('auth/')) {
    const { settings, auth } = store.getState();
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');

    try {
      await AsyncStorage.setItem('redux_state', JSON.stringify({
        settings: settings,
        auth: { user: auth.user, isAuthenticated: auth.isAuthenticated },
      }));
    } catch {
      // Ignore storage errors
    }
  }

  return result;
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  inspections: inspectionsReducer,
  employers: employersReducer,
  workers: workersReducer,
  offline: offlineReducer,
  settings: settingsReducer,
  sync: syncReducer,
});

// Configure store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(persistMiddleware),
});

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppDispatch: () => AppDispatch = useDispatch;