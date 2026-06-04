import type { Platform, PlatformAdapter } from './platform.types';
import { spotifyAdapter } from './spotify.adapter';
import { youtubeAdapter } from './youtube.adapter';
import { appleMusicAdapter } from './apple-music.adapter';

const adapters: Record<Platform, PlatformAdapter> = {
  SPOTIFY: spotifyAdapter,
  YOUTUBE: youtubeAdapter,
  APPLE_MUSIC: appleMusicAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}
