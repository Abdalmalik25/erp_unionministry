import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncState {
  lastSyncTime: number | null;
  isSyncing: boolean;
  syncProgress: number;
  totalToSync: number;
  errors: string[];
  lastSyncStats: {
    inspections: number;
    violations: number;
    photos: number;
  } | null;
}

const initialState: SyncState = {
  lastSyncTime: null,
  isSyncing: false,
  syncProgress: 0,
  totalToSync: 0,
  errors: [],
  lastSyncStats: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    startSync(state, action: PayloadAction<number>) {
      state.isSyncing = true;
      state.totalToSync = action.payload;
      state.syncProgress = 0;
      state.errors = [];
    },
    updateSyncProgress(state, action: PayloadAction<number>) {
      state.syncProgress = action.payload;
    },
    addSyncError(state, action: PayloadAction<string>) {
      state.errors.push(action.payload);
    },
    completeSync(state, action: PayloadAction<{ inspections: number; violations: number; photos: number }>) {
      state.isSyncing = false;
      state.lastSyncTime = Date.now();
      state.syncProgress = state.totalToSync;
      state.lastSyncStats = action.payload;
    },
    failSync(state) {
      state.isSyncing = false;
    },
    resetSync(state) {
      state.lastSyncTime = null;
      state.isSyncing = false;
      state.syncProgress = 0;
      state.totalToSync = 0;
      state.errors = [];
      state.lastSyncStats = null;
    },
  },
});

export const {
  startSync,
  updateSyncProgress,
  addSyncError,
  completeSync,
  failSync,
  resetSync,
} = syncSlice.actions;

// Selectors
export const selectSyncState = (state: { sync: SyncState }) => state.sync;
export const selectSyncProgress = (state: { sync: SyncState }) =>
  state.sync.totalToSync > 0 ? (state.sync.syncProgress / state.sync.totalToSync) * 100 : 0;
export const selectIsSyncing = (state: { sync: SyncState }) => state.sync.isSyncing;
export const selectSyncErrors = (state: { sync: SyncState }) => state.sync.errors;

export default syncSlice.reducer;