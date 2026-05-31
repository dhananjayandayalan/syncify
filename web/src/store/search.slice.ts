import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { searchApi } from '../api/search.api';
import { SearchResult } from '../types';

interface SearchState {
  query: string;
  results: SearchResult[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: SearchState = {
  query: '',
  results: [],
  total: 0,
  loading: false,
  error: null,
};

export const searchTracks = createAsyncThunk(
  'search/search',
  async ({ q, limit, offset }: { q: string; limit?: number; offset?: number }) => {
    return searchApi.search(q, limit, offset);
  },
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    clearResults(state) {
      state.results = [];
      state.total = 0;
      state.query = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchTracks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchTracks.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload.results;
        state.total = action.payload.total;
      })
      .addCase(searchTracks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Search failed';
      });
  },
});

export const { setQuery, clearResults } = searchSlice.actions;
export default searchSlice.reducer;
