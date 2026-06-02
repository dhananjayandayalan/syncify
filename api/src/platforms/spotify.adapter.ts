import { createHash } from 'crypto';
import { jaccardSimilarity } from '../lib/jaccard';
import type { PlatformAdapter, PlatformPlaylist, SearchTrack } from './platform.types';

const BASE = 'https://api.spotify.com/v1';

type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  preview_url: string | null;
  external_ids: { isrc?: string };
};

async function sfetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Spotify ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function toSearchTrack(t: SpotifyTrack): SearchTrack {
  return {
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    isrc: t.external_ids.isrc,
    durationMs: t.duration_ms,
    platformTrackId: t.id,
    previewUrl: t.preview_url ?? undefined,
    imageUrl: t.album.images[0]?.url,
  };
}

export class SpotifyAdapter implements PlatformAdapter {
  readonly platform = 'SPOTIFY' as const;

  async searchTrack(
    accessToken: string,
    query: string,
    isrc?: string,
    market?: string,
  ): Promise<SearchTrack | null> {
    const mkt = market ? `&market=${market}` : '';

    if (isrc) {
      const data = await sfetch<{ tracks: { items: SpotifyTrack[] } }>(
        `/search?type=track&q=isrc:${encodeURIComponent(isrc)}&limit=1${mkt}`,
        accessToken,
      );
      if (data.tracks.items.length > 0) return toSearchTrack(data.tracks.items[0]);
    }

    const data = await sfetch<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?type=track&q=${encodeURIComponent(query)}&limit=10${mkt}`,
      accessToken,
    );

    const best = data.tracks.items
      .map((t) => ({
        t,
        score: jaccardSimilarity(query, `${t.name} ${t.artists[0]?.name ?? ''}`),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.4) return null;
    return toSearchTrack(best.t);
  }

  async createPlaylist(
    accessToken: string,
    platformUserId: string,
    name: string,
    description?: string,
  ): Promise<PlatformPlaylist> {
    const data = await sfetch<{ id: string; name: string; tracks: { total: number } }>(
      `/users/${platformUserId}/playlists`,
      accessToken,
      { method: 'POST', body: JSON.stringify({ name, description: description ?? '', public: false }) },
    );
    return { platformPlaylistId: data.id, name: data.name, trackCount: data.tracks.total };
  }

  async addTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void> {
    for (let i = 0; i < trackIds.length; i += 100) {
      const chunk = trackIds.slice(i, i + 100);
      await sfetch(`/playlists/${platformPlaylistId}/tracks`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ uris: chunk.map((id) => `spotify:track:${id}`) }),
      });
    }
  }

  async removeTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void> {
    for (let i = 0; i < trackIds.length; i += 100) {
      const chunk = trackIds.slice(i, i + 100);
      await sfetch(`/playlists/${platformPlaylistId}/tracks`, accessToken, {
        method: 'DELETE',
        body: JSON.stringify({ tracks: chunk.map((id) => ({ uri: `spotify:track:${id}` })) }),
      });
    }
  }

  async getPlaylistSnapshot(accessToken: string, platformPlaylistId: string): Promise<string> {
    const data = await sfetch<{ snapshot_id: string }>(
      `/playlists/${platformPlaylistId}?fields=snapshot_id`,
      accessToken,
    );
    return data.snapshot_id;
  }

  async getPlaylistTracks(
    accessToken: string,
    platformPlaylistId: string,
  ): Promise<Array<{ platformTrackId: string; isrc?: string; title?: string; artist?: string; album?: string; durationMs?: number }>> {
    const result: Array<{ platformTrackId: string; isrc?: string; title?: string; artist?: string; album?: string; durationMs?: number }> = [];
    let nextPath: string | null =
      `/playlists/${platformPlaylistId}/tracks?fields=next,items(track(id,name,artists(name),album(name),duration_ms,external_ids))&limit=50`;

    while (nextPath) {
      const data = await sfetch<{
        next: string | null;
        items: Array<{ track: SpotifyTrack | null }>;
      }>(nextPath, accessToken);

      for (const item of data.items) {
        if (item.track?.id) {
          const t = item.track;
          result.push({
            platformTrackId: t.id,
            isrc: t.external_ids?.isrc,
            title: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            durationMs: t.duration_ms,
          });
        }
      }
      nextPath = data.next ? data.next.replace(BASE, '') : null;
    }
    return result;
  }

  async updateCoverImage(accessToken: string, platformPlaylistId: string, imageBase64: string): Promise<void> {
    // Spotify accepts the raw base64 string (no data URL prefix) with Content-Type: image/jpeg
    // Max 256 KB — our 300×300 JPEG is well under that
    const url = `${BASE}/playlists/${platformPlaylistId}/images`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBase64,
    });
    // 202 Accepted = success (image processing is async on Spotify's side)
    if (!res.ok && res.status !== 202) {
      const body = await res.text().catch(() => '');
      throw new Error(`Spotify image upload ${res.status}: ${body}`);
    }
  }

  async getUserPlaylists(accessToken: string): Promise<PlatformPlaylist[]> {
    const data = await sfetch<{ items: Array<{ id: string; name: string; tracks: { total: number } }> }>(
      '/me/playlists?limit=50',
      accessToken,
    );
    return (data.items ?? []).map((p) => ({
      platformPlaylistId: p.id,
      name: p.name,
      trackCount: p.tracks.total,
    }));
  }

  async deletePlaylist(accessToken: string, platformPlaylistId: string): Promise<void> {
    await sfetch(`/playlists/${platformPlaylistId}/followers`, accessToken, { method: 'DELETE' });
  }
}

export const spotifyAdapter = new SpotifyAdapter();
