import { getValidAccessToken } from '../../platforms/token-refresh';
import { AppError } from '../../lib/errors';

export async function searchSpotify(
  userId: string,
  q: string,
  market?: string,
  limit = 20,
  offset = 0,
) {
  let tokenInfo: { accessToken: string; market: string | null };
  try {
    tokenInfo = await getValidAccessToken(userId, 'SPOTIFY');
  } catch {
    throw new AppError(400, 'Connect your Spotify account to use search');
  }

  const mkt = market ?? tokenInfo.market ?? 'IN';
  const url = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&market=${mkt}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenInfo.accessToken}` } });

  if (!res.ok) throw new AppError(502, 'Spotify search failed');

  const data = await res.json() as {
    tracks: {
      total: number;
      items: Array<{
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { name: string; images: Array<{ url: string }> };
        duration_ms: number;
        preview_url: string | null;
        external_ids: { isrc?: string };
      }>;
    };
  };

  const results = data.tracks.items.map((t) => ({
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    isrc: t.external_ids.isrc,
    durationMs: t.duration_ms,
    platformTrackId: t.id,
    previewUrl: t.preview_url ?? undefined,
    imageUrl: t.album.images[0]?.url,
  }));

  return { results, total: data.tracks.total, limit, offset };
}
