import { api } from './client';

export const syncApi = {
  trigger: (playlistId: string) =>
    api.post<{ jobId: string | undefined }>(`/api/v1/playlists/${playlistId}/sync`),
};
