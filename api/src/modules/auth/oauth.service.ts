import { createHash, randomBytes } from 'crypto';
import { prisma } from '../../db/client';
import { encryptToken } from '../../crypto';
import { redis } from '../../lib/redis';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import type { Platform } from '../../platforms/platform.types';

const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'ugc-image-upload',
  'user-read-private',
  'user-read-email',
].join(' ');

function genState(): string {
  return randomBytes(16).toString('hex');
}

function genCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function genCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

class OAuthService {
  async getSpotifyAuthUrl(userId: string): Promise<{ url: string }> {
    const state = genState();
    const codeVerifier = genCodeVerifier();
    const codeChallenge = genCodeChallenge(codeVerifier);

    await redis.set(`spotify:oauth:${state}`, JSON.stringify({ userId, codeVerifier }), 'EX', 600);

    const params = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      scope: SPOTIFY_SCOPES,
    });

    return { url: `https://accounts.spotify.com/authorize?${params}` };
  }

  async handleSpotifyCallback(code: string, state: string): Promise<void> {
    const raw = await redis.get(`spotify:oauth:${state}`);
    if (!raw) throw new AppError(400, 'Invalid or expired OAuth state');
    await redis.del(`spotify:oauth:${state}`);

    const { userId, codeVerifier } = JSON.parse(raw) as { userId: string; codeVerifier: string };

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.SPOTIFY_REDIRECT_URI,
        client_id: env.SPOTIFY_CLIENT_ID,
        code_verifier: codeVerifier,
      }),
    });
    if (!tokenRes.ok) throw new AppError(400, 'Spotify token exchange failed');
    const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number };

    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new AppError(500, 'Failed to fetch Spotify profile');
    const profile = await profileRes.json() as { id: string; display_name: string | null; country: string };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: 'SPOTIFY' } },
      create: {
        userId, platform: 'SPOTIFY',
        accessToken: encryptToken(tokens.access_token),
        refreshToken: encryptToken(tokens.refresh_token),
        expiresAt, platformUserId: profile.id,
        market: profile.country,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: encryptToken(tokens.refresh_token),
        expiresAt, platformUserId: profile.id,
        market: profile.country,
      },
    });
  }

  async getYouTubeAuthUrl(userId: string): Promise<{ url: string }> {
    const state = genState();
    await redis.set(`youtube:oauth:${state}`, userId, 'EX', 600);

    const params = new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      redirect_uri: env.YOUTUBE_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }

  async handleYouTubeCallback(code: string, state: string): Promise<void> {
    const userId = await redis.get(`youtube:oauth:${state}`);
    if (!userId) throw new AppError(400, 'Invalid or expired OAuth state');
    await redis.del(`youtube:oauth:${state}`);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.YOUTUBE_REDIRECT_URI,
        client_id: env.YOUTUBE_CLIENT_ID,
        client_secret: env.YOUTUBE_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) throw new AppError(400, 'YouTube token exchange failed');
    const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number };

    const chRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const chData = await chRes.json() as { items?: Array<{ id: string; snippet: { title: string } }> };
    const channel = chData.items?.[0];

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.platformConnection.upsert({
      where: { userId_platform: { userId, platform: 'YOUTUBE' } },
      create: {
        userId, platform: 'YOUTUBE',
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiresAt, platformUserId: channel?.id ?? 'unknown',
        market: null,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        expiresAt, platformUserId: channel?.id ?? 'unknown',
      },
    });
  }

  async disconnect(userId: string, platform: Platform): Promise<void> {
    await prisma.platformConnection.deleteMany({ where: { userId, platform } });
  }
}

export const oauthService = new OAuthService();
