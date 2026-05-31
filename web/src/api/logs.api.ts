import { api } from './client';
import { SyncLog, Platform } from '../types';

export const logsApi = {
  list: (playlistId: string, platform?: Platform, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (platform) params.set('platform', platform);
    return api.get<{ logs: SyncLog[]; total: number; limit: number; offset: number }>(
      `/api/v1/playlists/${playlistId}/logs?${params}`,
    );
  },
};
