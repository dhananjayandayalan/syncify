import { api } from './client';
import { Platform, SearchResult } from '../types';

export const searchApi = {
  search: (q: string, limit = 20, offset = 0, market?: string, platform: Platform = 'SPOTIFY') => {
    const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset), platform });
    if (market) params.set('market', market);
    return api.get<{ results: SearchResult[]; total: number; limit: number; offset: number }>(
      `/api/v1/search?${params}`,
    );
  },
};
