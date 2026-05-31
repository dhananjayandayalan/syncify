import type { Platform, PlatformAdapter } from './platform.types';
import { spotifyAdapter } from './spotify.adapter';
import { youtubeAdapter } from './youtube.adapter';

const adapters: Record<Platform, PlatformAdapter> = {
  SPOTIFY: spotifyAdapter,
  YOUTUBE: youtubeAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}
