import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/auth.api';
import { setAccessToken, doRefresh } from '../api/client';
import { User, PlatformConnection } from '../types';

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  connections: PlatformConnection[];
  isRefreshing: boolean;
  appleMusicEnabled: boolean;
}

const initialState: AuthState = {
  status: 'unknown',
  user: null,
  connections: [],
  isRefreshing: false,
  appleMusicEnabled: false,
};

export const silentRefresh = createAsyncThunk('auth/silentRefresh', async () => {
  const newToken = await doRefresh();
  if (!newToken) throw new Error('Refresh failed');
  const me = await authApi.getMe();
  return me;
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.accessToken);
    return data;
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }: { name: string; email: string; password: string }) => {
    const data = await authApi.register(name, email, password);
    setAccessToken(data.accessToken);
    return data;
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {});
  setAccessToken(null);
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  return authApi.getMe();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setConnections(state, action: PayloadAction<PlatformConnection[]>) {
      state.connections = action.payload;
    },
    removeConnection(state, action: PayloadAction<string>) {
      state.connections = state.connections.filter((c) => c.platform !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(silentRefresh.pending, (state) => {
        state.isRefreshing = true;
      })
      .addCase(silentRefresh.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.connections = action.payload.connections;
        state.appleMusicEnabled = action.payload.features?.appleMusicEnabled ?? false;
      })
      .addCase(silentRefresh.rejected, (state) => {
        state.isRefreshing = false;
        state.status = 'unauthenticated';
        state.user = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.connections = action.payload.connections ?? [];
        state.appleMusicEnabled = action.payload.features?.appleMusicEnabled ?? false;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.connections = action.payload.connections ?? [];
        state.appleMusicEnabled = action.payload.features?.appleMusicEnabled ?? false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.status = 'unauthenticated';
        state.user = null;
        state.connections = [];
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.connections = action.payload.connections;
        state.appleMusicEnabled = action.payload.features?.appleMusicEnabled ?? false;
      });
  },
});

export const { setConnections, removeConnection } = authSlice.actions;
export default authSlice.reducer;
