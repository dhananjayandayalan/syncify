import { createHash, createSign } from 'crypto';
import { jaccardSimilarity } from '../lib/jaccard';
import { env, appleMusicEnabled } from '../config/env';
import type { PlatformAdapter, PlatformPlaylist, SearchTrack } from './platform.types';

const BASE = 'https://api.music.apple.com/v1';

// Developer token cached in memory — regenerated every 12 h
let _cachedDevToken = '';
let _devTokenExpiry = 0;

function getDeveloperToken(): string {
  if (!appleMusicEnabled) {
    throw new Error('Apple Music is not configured — add APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY to .env');
  }

  if (_cachedDevToken && Date.now() < _devTokenExpiry) return _cachedDevToken;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 43_200; // 12 hours

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: env.APPLE_MUSIC_KEY_ID! })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: env.APPLE_MUSIC_TEAM_ID!, iat: now, exp })).toString('base64url');
  const data = `${header}.${payload}`;

  const sign = createSign('SHA256');
  sign.update(data);
  const pem = env.APPLE_MUSIC_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const sig = sign.sign({ key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');

  _cachedDevToken = `${data}.${sig}`;
  _devTokenExpiry = Date.now() + 43_200_000;
  return _cachedDevToken;
}

type AppleSong = {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    isrc?: string;
    previews?: Array<{ url: string }>;
    artwork?: { url: string; width: number; height: number };
  };
};

// musicUserToken is stored as the accessToken in PlatformConnection
async function amfetch<T>(
  path: string,
  musicUserToken: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const devToken = getDeveloperToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${devToken}`,
      'Music-User-Token': musicUserToken,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Apple Music ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function artworkUrl(artwork?: { url: string }): string | undefined {
  if (!artwork) return undefined;
  return artwork.url.replace('{w}', '300').replace('{h}', '300');
}

function toSearchTrack(s: AppleSong): SearchTrack {
  return {
    title: s.attributes.name,
    artist: s.attributes.artistName,
    album: s.attributes.albumName,
    isrc: s.attributes.isrc,
    durationMs: s.attributes.durationInMillis,
    platformTrackId: s.id,
    previewUrl: s.attributes.previews?.[0]?.url,
    imageUrl: artworkUrl(s.attributes.artwork),
  };
}

export { getDeveloperToken };

export class AppleMusicAdapter implements PlatformAdapter {
  readonly platform = 'APPLE_MUSIC' as const;

  async searchTrack(
    accessToken: string,
    query: string,
    isrc?: string,
    market?: string,
  ): Promise<SearchTrack | null> {
    const storefront = market ?? 'us';

    if (isrc) {
      const data = await amfetch<{ data?: AppleSong[] }>(
        `/catalog/${storefront}/songs?filter[isrc]=${encodeURIComponent(isrc)}`,
        accessToken,
      );
      if (data.data && data.data.length > 0) return toSearchTrack(data.data[0]);
    }

    const data = await amfetch<{ results?: { songs?: { data: AppleSong[] } } }>(
      `/catalog/${storefront}/search?types=songs&term=${encodeURIComponent(query)}&limit=10`,
      accessToken,
    );

    const songs = data.results?.songs?.data ?? [];
    if (songs.length === 0) return null;

    const best = songs
      .map((s) => ({
        s,
        score: jaccardSimilarity(query, `${s.attributes.name} ${s.attributes.artistName}`),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.35) return null;
    return toSearchTrack(best.s);
  }

  async createPlaylist(
    accessToken: string,
    _platformUserId: string,
    name: string,
    description?: string,
  ): Promise<PlatformPlaylist> {
    const body: { attributes: { name: string; description?: string } } = {
      attributes: { name },
    };
    if (description) body.attributes.description = description;

    const data = await amfetch<{ data: Array<{ id: string; attributes: { name: string } }> }>(
      '/me/library/playlists',
      accessToken,
      { method: 'POST', body: JSON.stringify({ data: [body] }) },
    );
    const playlist = data.data[0];
    return { platformPlaylistId: playlist.id, name: playlist.attributes.name, trackCount: 0 };
  }

  async addTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void> {
    // Apple Music accepts up to 100 tracks per request
    for (let i = 0; i < trackIds.length; i += 100) {
      const chunk = trackIds.slice(i, i + 100);
      await amfetch(
        `/me/library/playlists/${platformPlaylistId}/tracks`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            data: chunk.map((id) => ({ id, type: 'songs' })),
          }),
        },
      );
    }
  }

  // Apple Music library API has no remove-track endpoint
  async removeTracks(_accessToken: string, _playlistId: string, _trackIds: string[]): Promise<void> {
    return;
  }

  async getPlaylistSnapshot(accessToken: string, platformPlaylistId: string): Promise<string> {
    const tracks = await this.getPlaylistTracks(accessToken, platformPlaylistId);
    const ids = tracks.map((t) => t.platformTrackId).join(',');
    return createHash('sha256').update(ids).digest('hex');
  }

  async getPlaylistTracks(
    accessToken: string,
    platformPlaylistId: string,
  ): Promise<Array<{ platformTrackId: string; isrc?: string; title?: string; artist?: string; album?: string; durationMs?: number }>> {
    type LibraryTracksPage = {
      data: Array<{
        id: string;
        attributes: { name?: string; artistName?: string; albumName?: string; durationInMillis?: number };
      }>;
      next?: string;
    };

    const result: Array<{ platformTrackId: string; isrc?: string; title?: string; artist?: string; album?: string; durationMs?: number }> = [];
    let path: string | null = `/me/library/playlists/${platformPlaylistId}/tracks?limit=100`;

    while (path) {
      const data: LibraryTracksPage = await amfetch<LibraryTracksPage>(path, accessToken);

      for (const item of data.data) {
        result.push({
          platformTrackId: item.id,
          title: item.attributes.name,
          artist: item.attributes.artistName,
          album: item.attributes.albumName,
          durationMs: item.attributes.durationInMillis,
        });
      }

      path = data.next ?? null;
    }

    return result;
  }

  async getUserPlaylists(accessToken: string): Promise<PlatformPlaylist[]> {
    const data = await amfetch<{
      data: Array<{ id: string; attributes: { name: string; trackCount?: number } }>;
    }>('/me/library/playlists?limit=100', accessToken);

    return (data.data ?? []).map((p) => ({
      platformPlaylistId: p.id,
      name: p.attributes.name,
      trackCount: p.attributes.trackCount ?? 0,
    }));
  }

  // Apple Music library API has no delete-playlist endpoint
  async deletePlaylist(_accessToken: string, _platformPlaylistId: string): Promise<void> {
    return;
  }
}

export const appleMusicAdapter = new AppleMusicAdapter();
