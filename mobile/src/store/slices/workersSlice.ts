import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { getApiClient } from '../../api/client';

interface Worker {
  id: string;
  firstName: string;
  firstNameAr: string;
  lastName: string;
  lastNameAr: string;
  nationalId: string;
  passportNumber?: string;
  nationality?: string;
  gender?: string;
  phone?: string;
  mobile?: string;
  governorate?: string;
  occupationTitle?: string;
  employerId?: string;
  employerName?: string;
  monthlyWage?: number;
  status: 'active' | 'suspended' | 'terminated' | 'emigrated';
  createdAt: string;
}

interface WorkersState {
  items: Worker[];
  currentWorker: Worker | null;
  searchResults: Worker[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkersState = {
  items: [],
  currentWorker: null,
  searchResults: [],
  isLoading: false,
  error: null,
};

export const fetchWorkers = createAsyncThunk(
  'workers/fetchAll',
  async (params?: { employerId?: string; governorate?: string; status?: string }) => {
    const client = getApiClient();
    const response = await client.workers.list({
      page: 1,
      limit: 100,
      ...params,
    });
    return response.items;
  }
);

export const searchWorkers = createAsyncThunk(
  'workers/search',
  async (query: string) => {
    const client = getApiClient();
    const response = await client.workers.list({ search: query, limit: 50 });
    return response.items;
  }
);

export const fetchWorker = createAsyncThunk(
  'workers/fetchOne',
  async (id: string) => {
    const client = getApiClient();
    return await client.workers.get(id);
  }
);

const workersSlice = createSlice({
  name: 'workers',
  initialState,
  reducers: {
    setCurrentWorker(state, action: PayloadAction<Worker | null>) {
      state.currentWorker = action.payload;
    },
    clearSearchResults(state) {
      state.searchResults = [];
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchWorkers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch workers';
      })
      .addCase(searchWorkers.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      })
      .addCase(fetchWorker.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchWorker.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWorker = action.payload;
      })
      .addCase(fetchWorker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch worker';
      });
  },
});

export const { setCurrentWorker, clearSearchResults, clearError } = workersSlice.actions;

// Selectors
export const selectWorkers = (state: { workers: WorkersState }) => state.workers.items;
export const selectCurrentWorker = (state: { workers: WorkersState }) => state.workers.currentWorker;
export const selectWorkersSearchResults = (state: { workers: WorkersState }) => state.workers.searchResults;
export const selectWorkersLoading = (state: { workers: WorkersState }) => state.workers.isLoading;

export default workersSlice.reducer;