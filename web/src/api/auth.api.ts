import { api } from './client';
import { User, PlatformConnection } from '../types';

type Features = { appleMusicEnabled: boolean };
type AuthResponse = { accessToken: string; user: User; connections: PlatformConnection[]; features: Features };

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/api/v1/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/v1/auth/login', { email, password }),

  refresh: () =>
    api.post<{ accessToken: string }>('/api/v1/auth/refresh', undefined, { skipAuth: true }),

  logout: () =>
    api.post<void>('/api/v1/auth/logout'),

  getMe: () =>
    api.get<{ user: User; connections: PlatformConnection[]; features: Features }>('/api/v1/auth/me'),

  getSpotifyAuthUrl: () =>
    api.get<{ url: string }>('/api/v1/auth/spotify/authorize'),

  getYoutubeAuthUrl: () =>
    api.get<{ url: string }>('/api/v1/auth/youtube/authorize'),

  getAppleMusicDeveloperToken: () =>
    api.get<{ developerToken: string }>('/api/v1/auth/apple-music/developer-token'),

  connectAppleMusic: (musicUserToken: string) =>
    api.post<{ success: boolean }>('/api/v1/auth/apple-music/connect', { musicUserToken }),

  disconnectPlatform: (platform: string) => {
    const slug = platform === 'APPLE_MUSIC' ? 'apple-music' : platform.toLowerCase();
    return api.delete<void>(`/api/v1/auth/${slug}/disconnect`);
  },
};
