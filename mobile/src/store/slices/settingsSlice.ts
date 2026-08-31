import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'en' | 'ar';

interface SettingsState {
  theme: ThemeMode;
  language: Language;
  biometricEnabled: boolean;
  notifications: {
    inspections: boolean;
    alerts: boolean;
    sync: boolean;
  };
  offlineMode: boolean;
  gpsAccuracy: 'high' | 'medium' | 'low';
  photoQuality: 'high' | 'medium' | 'low';
}

const initialState: SettingsState = {
  theme: 'system',
  language: 'ar',
  biometricEnabled: false,
  notifications: {
    inspections: true,
    alerts: true,
    sync: true,
  },
  offlineMode: false,
  gpsAccuracy: 'high',
  photoQuality: 'high',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
    setBiometricEnabled(state, action: PayloadAction<boolean>) {
      state.biometricEnabled = action.payload;
    },
    setNotifications(state, action: PayloadAction<Partial<SettingsState['notifications']>>) {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setOfflineMode(state, action: PayloadAction<boolean>) {
      state.offlineMode = action.payload;
    },
    setGpsAccuracy(state, action: PayloadAction<SettingsState['gpsAccuracy']>) {
      state.gpsAccuracy = action.payload;
    },
    setPhotoQuality(state, action: PayloadAction<SettingsState['photoQuality']>) {
      state.photoQuality = action.payload;
    },
  },
});

export const {
  setTheme,
  setLanguage,
  setBiometricEnabled,
  setNotifications,
  setOfflineMode,
  setGpsAccuracy,
  setPhotoQuality,
} = settingsSlice.actions;

// Selectors
export const selectTheme = (state: { settings: SettingsState }) => state.settings.theme;
export const selectLanguage = (state: { settings: SettingsState }) => state.settings.language;
export const selectBiometricEnabled = (state: { settings: SettingsState }) => state.settings.biometricEnabled;
export const selectNotifications = (state: { settings: SettingsState }) => state.settings.notifications;
export const selectOfflineMode = (state: { settings: SettingsState }) => state.settings.offlineMode;

export default settingsSlice.reducer;