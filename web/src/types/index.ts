export type Platform = 'SPOTIFY' | 'YOUTUBE';
export type TrackStatus = 'PENDING' | 'SYNCED' | 'NOT_FOUND' | 'FAILED';
export type SyncAction = 'ADD' | 'REMOVE';
export type SyncLogStatus = 'SUCCESS' | 'FAILED' | 'NOT_FOUND';
export type TriggerType = 'MANUAL' | 'POLLING';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface PlatformConnection {
  platform: Platform;
  platformUserId: string;
  market: string | null;
  connectedAt: string;
}

export interface PlaylistLink {
  platform: Platform;
  isActive: boolean;
  platformPlaylistId: string | null;
}

export interface PlatformTrack {
  id: string;
  platform: Platform;
  platformTrackId: string | null;
  status: TrackStatus;
}

export interface Track {
  id: string;
  playlistId: string;
  title: string;
  artist: string;
  album: string | null;
  isrc: string | null;
  durationMs: number | null;
  position: number;
  platformTracks: PlatformTrack[];
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  links: PlaylistLink[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  title: string;
  artist: string;
  album: string;
  isrc?: string;
  durationMs: number;
  platformTrackId: string;
  previewUrl?: string;
  imageUrl?: string;
}

export interface SyncLog {
  id: string;
  playlistId: string;
  platform: Platform;
  action: SyncAction;
  status: SyncLogStatus;
  trackTitle: string | null;
  trackArtist: string | null;
  message: string | null;
  triggeredBy: TriggerType;
  createdAt: string;
}
