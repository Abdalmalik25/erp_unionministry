import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { getApiClient } from '../../api/client';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface Violation {
  id: string;
  type: string;
  description: string;
  descriptionAr: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  legalReference?: string;
  fine?: number;
  photos?: string[];
}

interface Inspection {
  id: string;
  employerId: string;
  employerName: string;
  type: 'routine' | 'complaint' | 'follow_up' | 'scheduled' | 'unannounced';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  actualDate?: string;
  location?: string;
  coordinates?: Location;
  findings?: any[];
  violations: Violation[];
  recommendations?: string;
  inspectorNotes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

interface InspectionsState {
  items: Inspection[];
  currentInspection: Inspection | null;
  pendingSync: Inspection[];
  isLoading: boolean;
  error: string | null;
}

const initialState: InspectionsState = {
  items: [],
  currentInspection: null,
  pendingSync: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchInspections = createAsyncThunk(
  'inspections/fetchAll',
  async (params?: { status?: string; governorate?: string }) => {
    const client = getApiClient();
    const response = await client.inspections.list({
      page: 1,
      limit: 100,
      ...params,
    });
    return response.items;
  }
);

export const fetchInspection = createAsyncThunk(
  'inspections/fetchOne',
  async (id: string) => {
    const client = getApiClient();
    return await client.inspections.get(id);
  }
);

const inspectionsSlice = createSlice({
  name: 'inspections',
  initialState,
  reducers: {
    setCurrentInspection(state, action: PayloadAction<Inspection | null>) {
      state.currentInspection = action.payload;
    },
    addInspectionLocally(state, action: PayloadAction<Inspection>) {
      state.items.unshift(action.payload);
      state.pendingSync.push(action.payload);
    },
    updateInspectionLocally(state, action: PayloadAction<Inspection>) {
      const index = state.items.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.currentInspection?.id === action.payload.id) {
        state.currentInspection = action.payload;
      }
      // Add to pending sync if completed locally
      if (!state.pendingSync.find(i => i.id === action.payload.id)) {
        state.pendingSync.push(action.payload);
      }
    },
    addViolation(state, action: PayloadAction<{ inspectionId: string; violation: Violation }>) {
      const inspection = state.items.find(i => i.id === action.payload.inspectionId);
      if (inspection) {
        inspection.violations.push(action.payload.violation);
      }
      if (state.currentInspection?.id === action.payload.inspectionId) {
        state.currentInspection.violations.push(action.payload.violation);
      }
    },
    removePendingSync(state, action: PayloadAction<string>) {
      state.pendingSync = state.pendingSync.filter(i => i.id !== action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInspections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInspections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchInspections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch inspections';
      })
      .addCase(fetchInspection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInspection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentInspection = action.payload;
      })
      .addCase(fetchInspection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch inspection';
      });
  },
});

export const {
  setCurrentInspection,
  addInspectionLocally,
  updateInspectionLocally,
  addViolation,
  removePendingSync,
  clearError,
} = inspectionsSlice.actions;

// Selectors
export const selectInspections = (state: { inspections: InspectionsState }) => state.inspections.items;
export const selectCurrentInspection = (state: { inspections: InspectionsState }) => state.inspections.currentInspection;
export const selectPendingSync = (state: { inspections: InspectionsState }) => state.inspections.pendingSync;
export const selectInspectionsLoading = (state: { inspections: InspectionsState }) => state.inspections.isLoading;
export const selectInspectionsError = (state: { inspections: InspectionsState }) => state.inspections.error;

export default inspectionsSlice.reducer;