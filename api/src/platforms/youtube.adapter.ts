import { createHash } from 'crypto';
import { jaccardSimilarity } from '../lib/jaccard';
import type { PlatformAdapter, PlatformPlaylist, SearchTrack } from './platform.types';

const BASE = 'https://www.googleapis.com/youtube/v3';

type YTSnippet = { title: string; channelTitle: string; thumbnails?: { default?: { url: string } } };
type YTSearchItem = { id: { videoId: string }; snippet: YTSnippet };
type YTPlaylistItem = {
  id: string;
  contentDetails: { videoId: string };
  snippet: { title: string; videoOwnerChannelTitle?: string; channelTitle?: string };
};

async function ytfetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`YouTube ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Strip common YouTube title noise so stored titles and Spotify searches are clean
const YT_NOISE = /\s*[\[(](?:official\s*(?:audio|video|music\s*video|lyric(?:s)?\s*video|visualizer|hd)|lyrics?|live|audio|hd|hq|4k|visualizer|remastered|explicit)[^\])]*\)[\])]|\s*[-|]\s*(?:official\s*(?:audio|video)|lyrics?)\s*$/gi;

function cleanYouTubeTitle(title: string): string {
  return title.replace(YT_NOISE, '').replace(/\s{2,}/g, ' ').trim();
}

function cleanYouTubeArtist(channel: string): string {
  return channel.replace(/\s*-\s*topic$/i, '').replace(/\s*vevo$/i, '').trim();
}

function scoreItem(item: YTSearchItem, query: string): number {
  let score = jaccardSimilarity(query, `${item.snippet.title} ${item.snippet.channelTitle}`);
  if (item.snippet.channelTitle.toLowerCase().includes('- topic')) score += 0.3;
  if (item.snippet.title.toLowerCase().includes('official audio')) score += 0.2;
  if (item.snippet.title.toLowerCase().includes('official lyric')) score += 0.1;
  return score;
}

export class YouTubeAdapter implements PlatformAdapter {
  readonly platform = 'YOUTUBE' as const;

  async searchTrack(
    accessToken: string,
    query: string,
    _isrc?: string,
    _market?: string,
  ): Promise<SearchTrack | null> {
    const q = encodeURIComponent(`${query} official audio`);
    const data = await ytfetch<{ items: YTSearchItem[] }>(
      `/search?part=snippet&type=video&q=${q}&maxResults=10`,
      accessToken,
    );

    if (!data.items?.length) return null;

    const best = data.items
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.15) return null;

    const { item } = best;
    return {
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      platformTrackId: item.id.videoId,
      imageUrl: item.snippet.thumbnails?.default?.url,
    };
  }

  async createPlaylist(
    accessToken: string,
    _platformUserId: string,
    name: string,
    description?: string,
  ): Promise<PlatformPlaylist> {
    const data = await ytfetch<{ id: string; snippet: { title: string } }>(
      `/playlists?part=snippet,status`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          snippet: { title: name, description: description ?? '' },
          status: { privacyStatus: 'private' },
        }),
      },
    );
    return { platformPlaylistId: data.id, name: data.snippet.title, trackCount: 0 };
  }

  async addTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void> {
    for (const videoId of trackIds) {
      await ytfetch(`/playlistItems?part=snippet`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          snippet: {
            playlistId: platformPlaylistId,
            resourceId: { kind: 'youtube#video', videoId },
          },
        }),
      });
    }
  }

  async removeTracks(accessToken: string, platformPlaylistId: string, trackIds: string[]): Promise<void> {
    const items = await this.fetchPlaylistItems(accessToken, platformPlaylistId);
    const map = new Map(items.map((i) => [i.contentDetails.videoId, i.id]));
    for (const videoId of trackIds) {
      const itemId = map.get(videoId);
      if (!itemId) continue;
      await ytfetch(`/playlistItems?id=${itemId}`, accessToken, { method: 'DELETE' });
    }
  }

  async getPlaylistSnapshot(accessToken: string, platformPlaylistId: string): Promise<string> {
    const items = await this.fetchPlaylistItems(accessToken, platformPlaylistId);
    const ids = items.map((i) => i.contentDetails.videoId).join(',');
    return createHash('sha256').update(ids).digest('hex');
  }

  async getPlaylistTracks(
    accessToken: string,
    platformPlaylistId: string,
  ): Promise<Array<{ platformTrackId: string; isrc?: string; title?: string; artist?: string }>> {
    const items = await this.fetchPlaylistItems(accessToken, platformPlaylistId);
    return items.map((i) => ({
      platformTrackId: i.contentDetails.videoId,
      title: cleanYouTubeTitle(i.snippet.title),
      artist: cleanYouTubeArtist(i.snippet.videoOwnerChannelTitle ?? i.snippet.channelTitle ?? ''),
    }));
  }

  async getUserPlaylists(accessToken: string): Promise<PlatformPlaylist[]> {
    const data = await ytfetch<{
      items?: Array<{ id: string; snippet: { title: string }; contentDetails: { itemCount: number } }>;
    }>('/playlists?part=snippet,contentDetails&mine=true&maxResults=50', accessToken);
    return (data.items ?? []).map((p) => ({
      platformPlaylistId: p.id,
      name: p.snippet.title,
      trackCount: p.contentDetails.itemCount,
    }));
  }

  async deletePlaylist(accessToken: string, platformPlaylistId: string): Promise<void> {
    await ytfetch(`/playlists?id=${platformPlaylistId}`, accessToken, { method: 'DELETE' });
  }

  private async fetchPlaylistItems(accessToken: string, playlistId: string): Promise<YTPlaylistItem[]> {
    const items: YTPlaylistItem[] = [];
    let pageToken: string | undefined;
    do {
      const tokenParam = pageToken ? `&pageToken=${pageToken}` : '';
      const data = await ytfetch<{ nextPageToken?: string; items?: YTPlaylistItem[] }>(
        `/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${tokenParam}`,
        accessToken,
      );
      items.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return items;
  }
}

export const youtubeAdapter = new YouTubeAdapter();
