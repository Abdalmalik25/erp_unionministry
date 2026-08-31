import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  pendingActions: OfflineAction[];
  lastSyncTime: number | null;
  isSyncing: boolean;
  syncError: string | null;
}

const initialState: OfflineState = {
  pendingActions: [],
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    addOfflineAction(state, action: PayloadAction<Omit<OfflineAction, 'id' | 'retryCount'>>) {
      state.pendingActions.push({
        ...action.payload,
        id: `${action.payload.type}-${action.payload.timestamp}`,
        retryCount: 0,
      });
    },
    removeOfflineAction(state, action: PayloadAction<number>) {
      state.pendingActions = state.pendingActions.filter(a => a.timestamp !== action.payload);
    },
    incrementRetryCount(state, action: PayloadAction<string>) {
      const actionItem = state.pendingActions.find(a => a.id === action.payload);
      if (actionItem) {
        actionItem.retryCount++;
      }
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },
    setSyncError(state, action: PayloadAction<string | null>) {
      state.syncError = action.payload;
    },
    setLastSyncTime(state, action: PayloadAction<number>) {
      state.lastSyncTime = action.payload;
    },
    clearPendingActions(state) {
      state.pendingActions = [];
    },
  },
});

export const {
  addOfflineAction,
  removeOfflineAction,
  incrementRetryCount,
  setSyncing,
  setSyncError,
  setLastSyncTime,
  clearPendingActions,
} = offlineSlice.actions;

// Selectors
export const selectPendingActions = (state: { offline: OfflineState }) => state.offline.pendingActions;
export const selectPendingCount = (state: { offline: OfflineState }) => state.offline.pendingActions.length;
export const selectLastSyncTime = (state: { offline: OfflineState }) => state.offline.lastSyncTime;
export const selectIsSyncing = (state: { offline: OfflineState }) => state.offline.isSyncing;

export default offlineSlice.reducer;