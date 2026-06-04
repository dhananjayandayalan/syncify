import { prisma } from '../db/client';
import { decryptToken, encryptToken } from '../crypto';
import { env } from '../config/env';
import type { Platform } from './platform.types';

export interface TokenInfo {
  accessToken: string;
  platformUserId: string;
  market: string | null;
}

export async function getValidAccessToken(userId: string, platform: Platform): Promise<TokenInfo> {
  const conn = await prisma.platformConnection.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!conn) throw new Error(`No ${platform} connection found for user ${userId}`);

  const isExpired = conn.expiresAt && conn.expiresAt <= new Date(Date.now() + 60_000);

  if (!isExpired || platform === 'APPLE_MUSIC') {
    return {
      accessToken: decryptToken(conn.accessToken),
      platformUserId: conn.platformUserId,
      market: conn.market,
    };
  }

  const refreshToken = conn.refreshToken ? decryptToken(conn.refreshToken) : null;
  if (!refreshToken) throw new Error(`No refresh token for ${platform}`);

  let newAccessToken: string;
  let newExpiresAt: Date;
  let newRefreshToken: string | null = null;

  if (platform === 'SPOTIFY') {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.SPOTIFY_CLIENT_ID,
      }),
    });
    if (!res.ok) throw new Error('Spotify token refresh failed');
    const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
    newAccessToken = data.access_token;
    newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    newRefreshToken = data.refresh_token ?? null;
  } else {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.YOUTUBE_CLIENT_ID,
        client_secret: env.YOUTUBE_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new Error('YouTube token refresh failed');
    const data = await res.json() as { access_token: string; expires_in: number };
    newAccessToken = data.access_token;
    newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  }

  await prisma.platformConnection.update({
    where: { userId_platform: { userId, platform } },
    data: {
      accessToken: encryptToken(newAccessToken),
      expiresAt: newExpiresAt,
      ...(newRefreshToken && { refreshToken: encryptToken(newRefreshToken) }),
    },
  });

  return { accessToken: newAccessToken, platformUserId: conn.platformUserId, market: conn.market };
}
