import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { playlistsApi } from '../api/playlists.api';
import { Playlist, Platform } from '../types';

interface PlaylistsState {
  items: Playlist[];
  current: Playlist | null;
  loading: boolean;
  error: string | null;
}

const initialState: PlaylistsState = {
  items: [],
  current: null,
  loading: false,
  error: null,
};

export const fetchPlaylists = createAsyncThunk('playlists/fetchAll', async () => {
  return playlistsApi.list();
});

export const fetchPlaylist = createAsyncThunk('playlists/fetchOne', async (id: string) => {
  return playlistsApi.get(id);
});

export const createPlaylist = createAsyncThunk(
  'playlists/create',
  async ({ name, description }: { name: string; description?: string }) => {
    return playlistsApi.create(name, description);
  },
);

export const deletePlaylist = createAsyncThunk('playlists/delete', async (id: string) => {
  await playlistsApi.delete(id);
  return id;
});

export const linkPlatform = createAsyncThunk(
  'playlists/linkPlatform',
  async ({ id, platform }: { id: string; platform: Platform }) => {
    return playlistsApi.linkPlatform(id, platform);
  },
);

export const importPlaylist = createAsyncThunk(
  'playlists/import',
  async ({ platform, platformPlaylistId, name }: { platform: Platform; platformPlaylistId: string; name: string }) => {
    return playlistsApi.importFromPlatform(platform, platformPlaylistId, name);
  },
);

export const unlinkPlatform = createAsyncThunk(
  'playlists/unlinkPlatform',
  async ({ id, platform }: { id: string; platform: Platform }) => {
    await playlistsApi.unlinkPlatform(id, platform);
    return { id, platform };
  },
);

const playlistsSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaylists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlaylists.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.playlists;
      })
      .addCase(fetchPlaylists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load playlists';
      })
      .addCase(fetchPlaylist.fulfilled, (state, action) => {
        state.current = action.payload.playlist;
        const idx = state.items.findIndex((p) => p.id === action.payload.playlist.id);
        if (idx >= 0) state.items[idx] = action.payload.playlist;
        else state.items.push(action.payload.playlist);
      })
      .addCase(createPlaylist.fulfilled, (state, action) => {
        state.items.unshift(action.payload.playlist);
      })
      .addCase(importPlaylist.fulfilled, (state, action) => {
        state.items.unshift(action.payload.playlist);
      })
      .addCase(deletePlaylist.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
        if (state.current?.id === action.payload) state.current = null;
      })
      .addCase(linkPlatform.fulfilled, (state, action) => {
        if (state.current) {
          const exists = state.current.links.find((l) => l.platform === action.payload.link.platform);
          if (exists) {
            exists.isActive = true;
            exists.platformPlaylistId = action.payload.link.platformPlaylistId;
          } else {
            state.current.links.push({ ...action.payload.link, isActive: true });
          }
        }
      })
      .addCase(unlinkPlatform.fulfilled, (state, action) => {
        if (state.current) {
          state.current.links = state.current.links.filter(
            (l) => l.platform !== action.payload.platform,
          );
        }
      });
  },
});

export default playlistsSlice.reducer;
