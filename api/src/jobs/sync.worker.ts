import { Job } from 'bullmq';
import { prisma } from '../db/client';
import { getAdapter } from '../platforms';
import { getValidAccessToken } from '../platforms/token-refresh';
import { SyncJobData } from './queue';
import { Platform } from '@prisma/client';

export async function processSyncJob(job: Job<SyncJobData>) {
  const { playlistId, userId, triggeredBy } = job.data;

  let playlist = await getPlaylist(playlistId);
  if (!playlist) return;

  // Always pull external changes first (works for both MANUAL and POLLING)
  let anyPulled = false;
  for (const link of playlist.links) {
    if (!link.platformPlaylistId) continue;
    const pulled = await pullFromPlatform(playlist, link, userId);
    if (pulled) anyPulled = true;
  }

  // Re-fetch so push phase sees any newly imported tracks
  if (anyPulled) {
    playlist = (await getPlaylist(playlistId)) ?? playlist;
  }

  // Push PENDING tracks from Syncify to all platforms
  for (const link of playlist.links) {
    await syncPlatform(playlist, link, userId, triggeredBy);
  }
}

// Pull tracks added on the platform (outside Syncify) back into Syncify. Returns true if new tracks were imported.
async function pullFromPlatform(
  playlist: NonNullable<Awaited<ReturnType<typeof getPlaylist>>>,
  link: { platform: Platform; platformPlaylistId: string | null; snapshotId: string | null },
  userId: string,
): Promise<boolean> {
  const adapter = getAdapter(link.platform);
  let tokenInfo: { accessToken: string; platformUserId: string; market: string | null };

  try {
    tokenInfo = await getValidAccessToken(userId, link.platform);
  } catch {
    return false;
  }

  const { accessToken } = tokenInfo;
  const platformPlaylistId = link.platformPlaylistId!;

  // Check if anything changed using the snapshot
  let currentSnapshot: string;
  try {
    currentSnapshot = await adapter.getPlaylistSnapshot(accessToken, platformPlaylistId);
  } catch {
    return false;
  }

  if (currentSnapshot === link.snapshotId) return false; // nothing changed

  // Snapshot differs — fetch current tracks from platform
  let platformTracks: Array<{
    platformTrackId: string;
    isrc?: string;
    title?: string;
    artist?: string;
    album?: string;
    durationMs?: number;
  }>;
  try {
    platformTracks = await adapter.getPlaylistTracks(accessToken, platformPlaylistId);
  } catch {
    return false;
  }

  // Build set of platformTrackIds already known in Syncify for this platform
  const knownIds = new Set(
    playlist.tracks
      .flatMap((t) => t.platformTracks)
      .filter((pt) => pt.platform === link.platform && pt.platformTrackId)
      .map((pt) => pt.platformTrackId!),
  );

  const newPlatformTracks = platformTracks.filter((pt) => !knownIds.has(pt.platformTrackId));

  if (newPlatformTracks.length > 0) {
    const activeLinks = playlist.links;
    const maxPos = await prisma.playlistTrack.aggregate({
      where: { playlistId: playlist.id },
      _max: { position: true },
    });
    let position = (maxPos._max.position ?? -1) + 1;

    for (const pt of newPlatformTracks) {
      if (!pt.title) continue; // skip tracks without metadata

      // Check duplicate by ISRC
      if (pt.isrc) {
        const dup = await prisma.playlistTrack.findFirst({
          where: { playlistId: playlist.id, isrc: pt.isrc },
        });
        if (dup) {
          // Track exists by ISRC but missing platformTrack record — backfill it
          await prisma.platformTrack.upsert({
            where: { playlistTrackId_platform: { playlistTrackId: dup.id, platform: link.platform } },
            create: { playlistTrackId: dup.id, platform: link.platform, platformTrackId: pt.platformTrackId, status: 'SYNCED' },
            update: { platformTrackId: pt.platformTrackId, status: 'SYNCED' },
          });
          continue;
        }
      }

      const track = await prisma.playlistTrack.create({
        data: {
          playlistId: playlist.id,
          title: pt.title,
          artist: pt.artist ?? '',
          album: pt.album,
          isrc: pt.isrc,
          durationMs: pt.durationMs,
          position: position++,
          platformTracks: {
            create: activeLinks.map((l) => ({
              platform: l.platform,
              platformTrackId: l.platform === link.platform ? pt.platformTrackId : undefined,
              status: l.platform === link.platform ? ('SYNCED' as const) : ('PENDING' as const),
            })),
          },
        },
      });

      await logSync(
        playlist.id, link.platform, 'ADD', 'SUCCESS', 'POLLING',
        track.title, track.artist, 'Imported from platform',
      );
    }
  }

  // Update stored snapshot
  await prisma.playlistLink.update({
    where: { playlistId_platform: { playlistId: playlist.id, platform: link.platform } },
    data: { snapshotId: currentSnapshot },
  });

  return newPlatformTracks.length > 0;
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
        accessToken, platformUserId, playlist.name, playlist.description ?? undefined,
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
      const found = await adapter.searchTrack(
        accessToken,
        `${track.title} ${track.artist}`,
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

  // Update snapshot after a successful push sync
  try {
    const snapshot = await adapter.getPlaylistSnapshot(accessToken, platformPlaylistId);
    await prisma.playlistLink.update({
      where: { playlistId_platform: { playlistId: playlist.id, platform: link.platform } },
      data: { snapshotId: snapshot, lastSyncedAt: new Date() },
    });
  } catch {
    // Non-critical
  }
}

async function logSync(
  playlistId: string, platform: Platform,
  action: 'ADD' | 'REMOVE', status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND',
  triggeredBy: string, trackTitle: string | null, trackArtist: string | null, message: string | null,
) {
  await prisma.syncLog.create({
    data: {
      playlistId, platform, action, status,
      trackTitle, trackArtist, message,
      triggeredBy: triggeredBy as 'MANUAL' | 'POLLING',
    },
  });
}

async function getPlaylist(playlistId: string) {
  return prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      links: { where: { isActive: true } },
      tracks: { include: { platformTracks: true }, orderBy: { position: 'asc' } },
    },
  });
}
