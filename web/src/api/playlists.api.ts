import { api } from './client';
import { Playlist, Platform } from '../types';

export const playlistsApi = {
  list: () =>
    api.get<{ playlists: Playlist[] }>('/api/v1/playlists'),

  get: (id: string) =>
    api.get<{ playlist: Playlist }>(`/api/v1/playlists/${id}`),

  create: (name: string, description?: string) =>
    api.post<{ playlist: Playlist }>('/api/v1/playlists', { name, description }),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<{ playlist: Playlist }>(`/api/v1/playlists/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/v1/playlists/${id}`),

  linkPlatform: (id: string, platform: Platform) =>
    api.post<{ link: { platform: Platform; platformPlaylistId: string | null } }>(
      `/api/v1/playlists/${id}/links`,
      { platform },
    ),

  unlinkPlatform: (id: string, platform: Platform) =>
    api.delete<void>(`/api/v1/playlists/${id}/links/${platform}`),
};
