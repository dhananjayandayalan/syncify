import { Job } from 'bullmq';
import { prisma } from '../db/client';
import { getAdapter } from '../platforms';
import { getValidAccessToken } from '../platforms/token-refresh';
import { SyncJobData } from './queue';
import { Platform } from '@prisma/client';

export async function processSyncJob(job: Job<SyncJobData>) {
  const { playlistId, userId, triggeredBy } = job.data;

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      links: { where: { isActive: true } },
      tracks: {
        include: { platformTracks: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!playlist) return;

  for (const link of playlist.links) {
    await syncPlatform(playlist, link, userId, triggeredBy);
  }
}

async function syncPlatform(
  playlist: NonNullable<Awaited<ReturnType<typeof getPlaylist>>>,
  link: { platform: Platform; platformPlaylistId: string | null },
  userId: string,
  triggeredBy: string,
) {
  const adapter = getAdapter(link.platform);
  let tokenInfo: { accessToken: string; platformUserId: string; market: string | null };

  try {
    tokenInfo = await getValidAccessToken(userId, link.platform);
  } catch {
    await logSync(playlist.id, link.platform, 'ADD', 'FAILED', triggeredBy, null, null, 'Platform not connected');
    return;
  }

  const { accessToken, platformUserId } = tokenInfo;
  let platformPlaylistId = link.platformPlaylistId;

  if (!platformPlaylistId) {
    try {
      const created = await adapter.createPlaylist(
        accessToken,
        platformUserId,
        playlist.name,
        playlist.description ?? undefined,
      );
      platformPlaylistId = created.platformPlaylistId;
      await prisma.playlistLink.update({
        where: { playlistId_platform: { playlistId: playlist.id, platform: link.platform } },
        data: { platformPlaylistId },
      });
    } catch {
      await logSync(playlist.id, link.platform, 'ADD', 'FAILED', triggeredBy, null, null, 'Failed to create platform playlist');
      return;
    }
  }

  const pendingTracks = playlist.tracks.filter((t) =>
    t.platformTracks.some((pt) => pt.platform === link.platform && pt.status === 'PENDING'),
  );

  for (const track of pendingTracks) {
    const platformTrack = track.platformTracks.find((pt) => pt.platform === link.platform);
    if (!platformTrack) continue;

    let platformTrackId = platformTrack.platformTrackId;

    if (!platformTrackId) {
      const query = `${track.title} ${track.artist}`;
      const found = await adapter.searchTrack(
        accessToken,
        query,
        track.isrc ?? undefined,
        tokenInfo.market ?? undefined,
      );

      if (!found) {
        await prisma.platformTrack.updateMany({
          where: { playlistTrackId: track.id, platform: link.platform },
          data: { status: 'NOT_FOUND' },
        });
        await logSync(playlist.id, link.platform, 'ADD', 'NOT_FOUND', triggeredBy, track.title, track.artist, 'No matching track found on platform');
        continue;
      }

      platformTrackId = found.platformTrackId;
      await prisma.platformTrack.updateMany({
        where: { playlistTrackId: track.id, platform: link.platform },
        data: { platformTrackId },
      });
    }

    try {
      await adapter.addTracks(accessToken, platformPlaylistId, [platformTrackId]);
      await prisma.platformTrack.updateMany({
        where: { playlistTrackId: track.id, platform: link.platform },
        data: { status: 'SYNCED' },
      });
      await logSync(playlist.id, link.platform, 'ADD', 'SUCCESS', triggeredBy, track.title, track.artist, null);
    } catch {
      await prisma.platformTrack.updateMany({
        where: { playlistTrackId: track.id, platform: link.platform },
        data: { status: 'FAILED' },
      });
      await logSync(playlist.id, link.platform, 'ADD', 'FAILED', triggeredBy, track.title, track.artist, 'Failed to add track to platform playlist');
    }
  }
}

async function logSync(
  playlistId: string,
  platform: Platform,
  action: 'ADD' | 'REMOVE',
  status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND',
  triggeredBy: string,
  trackTitle: string | null,
  trackArtist: string | null,
  message: string | null,
) {
  await prisma.syncLog.create({
    data: {
      playlistId,
      platform,
      action,
      status,
      trackTitle,
      trackArtist,
      message,
      triggeredBy: triggeredBy as 'MANUAL' | 'POLLING',
    },
  });
}

async function getPlaylist(playlistId: string) {
  return prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      links: { where: { isActive: true } },
      tracks: {
        include: { platformTracks: true },
        orderBy: { position: 'asc' },
      },
    },
  });
}
