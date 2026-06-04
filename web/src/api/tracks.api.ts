import { api } from './client';
import { Platform, Track } from '../types';

interface AddTrackPayload {
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  durationMs?: number;
  spotifyTrackId: string;
}

export const tracksApi = {
  list: (playlistId: string) =>
    api.get<{ tracks: Track[] }>(`/api/v1/playlists/${playlistId}/tracks`),

  add: (playlistId: string, track: AddTrackPayload) =>
    api.post<{ track: Track }>(`/api/v1/playlists/${playlistId}/tracks`, track),

  remove: (playlistId: string, trackId: string) =>
    api.delete<void>(`/api/v1/playlists/${playlistId}/tracks/${trackId}`),

  manualMatch: (playlistId: string, trackId: string, platform: Platform, platformTrackId: string) =>
    api.patch<void>(`/api/v1/playlists/${playlistId}/tracks/${trackId}/match`, { platform, platformTrackId }),

  retryFailed: (playlistId: string) =>
    api.post<{ retried: number }>(`/api/v1/playlists/${playlistId}/tracks/retry-failed`, {}),
};
