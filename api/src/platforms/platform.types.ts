export type Platform = 'SPOTIFY' | 'YOUTUBE';

export interface SearchTrack {
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  durationMs?: number;
  platformTrackId: string;
  previewUrl?: string;
  imageUrl?: string;
}

export interface PlatformPlaylist {
  platformPlaylistId: string;
  name: string;
  trackCount: number;
}

export interface PlatformAdapter {
  readonly platform: Platform;

  searchTrack(
    accessToken: string,
    query: string,
    isrc?: string,
    market?: string,
  ): Promise<SearchTrack | null>;

  createPlaylist(
    accessToken: string,
    platformUserId: string,
    name: string,
    description?: string,
  ): Promise<PlatformPlaylist>;

  addTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void>;

  removeTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void>;

  getPlaylistSnapshot(accessToken: string, platformPlaylistId: string): Promise<string>;

  getPlaylistTracks(
    accessToken: string,
    platformPlaylistId: string,
  ): Promise<Array<{
    platformTrackId: string;
    isrc?: string;
    title?: string;
    artist?: string;
    album?: string;
    durationMs?: number;
  }>>;

  getUserPlaylists(accessToken: string): Promise<PlatformPlaylist[]>;

  // Optional — not all platforms support updating playlist cover images via API
  updateCoverImage?(accessToken: string, platformPlaylistId: string, imageBase64: string): Promise<void>;

  deletePlaylist(accessToken: string, platformPlaylistId: string): Promise<void>;
}
