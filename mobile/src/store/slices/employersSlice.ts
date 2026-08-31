import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { getApiClient } from '../../api/client';

interface Employer {
  id: string;
  name: string;
  nameAr: string;
  type: 'union' | 'employer' | 'cooperative' | 'professional_association';
  status: 'active' | 'inactive' | 'suspended' | 'under_investigation';
  registrationNumber?: string;
  sector?: string;
  isicCode?: string;
  address?: string;
  governorate?: string;
  district?: string;
  contactPhone?: string;
  contactEmail?: string;
  employeeCount?: number;
  createdAt: string;
}

interface EmployersState {
  items: Employer[];
  currentEmployer: Employer | null;
  searchResults: Employer[];
  isLoading: boolean;
  error: string | null;
}

const initialState: EmployersState = {
  items: [],
  currentEmployer: null,
  searchResults: [],
  isLoading: false,
  error: null,
};

export const fetchEmployers = createAsyncThunk(
  'employers/fetchAll',
  async (params?: { governorate?: string; status?: string }) => {
    const client = getApiClient();
    const response = await client.employers.list({
      page: 1,
      limit: 100,
      ...params,
    });
    return response.items;
  }
);

export const searchEmployers = createAsyncThunk(
  'employers/search',
  async (query: string) => {
    const client = getApiClient();
    const response = await client.entities.list({ search: query, limit: 50 });
    return response.items.filter((e: any) => e.type === 'employer');
  }
);

export const fetchEmployer = createAsyncThunk(
  'employers/fetchOne',
  async (id: string) => {
    const client = getApiClient();
    return await client.employers.get(id);
  }
);

const employersSlice = createSlice({
  name: 'employers',
  initialState,
  reducers: {
    setCurrentEmployer(state, action: PayloadAction<Employer | null>) {
      state.currentEmployer = action.payload;
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
      .addCase(fetchEmployers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchEmployers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch employers';
      })
      .addCase(searchEmployers.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      })
      .addCase(fetchEmployer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchEmployer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEmployer = action.payload;
      })
      .addCase(fetchEmployer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch employer';
      });
  },
});

export const { setCurrentEmployer, clearSearchResults, clearError } = employersSlice.actions;

// Selectors
export const selectEmployers = (state: { employers: EmployersState }) => state.employers.items;
export const selectCurrentEmployer = (state: { employers: EmployersState }) => state.employers.currentEmployer;
export const selectSearchResults = (state: { employers: EmployersState }) => state.employers.searchResults;
export const selectEmployersLoading = (state: { employers: EmployersState }) => state.employers.isLoading;

export default employersSlice.reducer;