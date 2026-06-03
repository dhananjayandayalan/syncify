import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { addSyncJob } from '../../jobs/queue';
import { getAdapter } from '../../platforms';
import { getValidAccessToken } from '../../platforms/token-refresh';

class TracksService {
  async list(userId: string, playlistId: string) {
    await this.assertOwner(userId, playlistId);
    return prisma.playlistTrack.findMany({
      where: { playlistId },
      include: { platformTracks: true },
      orderBy: { position: 'asc' },
    });
  }

  async add(
    userId: string,
    playlistId: string,
    data: {
      title: string;
      artist: string;
      album?: string;
      isrc?: string;
      durationMs?: number;
      spotifyTrackId: string;
    },
  ) {
    await this.assertOwner(userId, playlistId);

    if (data.isrc) {
      const dup = await prisma.playlistTrack.findFirst({ where: { playlistId, isrc: data.isrc } });
      if (dup) throw new AppError(409, 'Track already in playlist');
    }

    const agg = await prisma.playlistTrack.aggregate({ where: { playlistId }, _max: { position: true } });
    const position = (agg._max.position ?? -1) + 1;

    const links = await prisma.playlistLink.findMany({ where: { playlistId, isActive: true } });

    const track = await prisma.playlistTrack.create({
      data: {
        playlistId,
        title: data.title,
        artist: data.artist,
        album: data.album,
        isrc: data.isrc,
        durationMs: data.durationMs,
        position,
        platformTracks: {
          create: links.map((l) => ({
            platform: l.platform,
            platformTrackId: l.platform === 'SPOTIFY' ? data.spotifyTrackId : undefined,
            status: 'PENDING' as const,
          })),
        },
      },
      include: { platformTracks: true },
    });

    if (links.length > 0) {
      await addSyncJob({ playlistId, userId, triggeredBy: 'MANUAL' });
    }

    return track;
  }

  async remove(userId: string, playlistId: string, trackId: string) {
    await this.assertOwner(userId, playlistId);

    const track = await prisma.playlistTrack.findUnique({
      where: { id: trackId },
      include: { platformTracks: true },
    });
    if (!track || track.playlistId !== playlistId) throw new AppError(404, 'Track not found');

    // Remove from platform playlists before deleting from DB
    const links = await prisma.playlistLink.findMany({ where: { playlistId, isActive: true } });
    await Promise.allSettled(
      links.map(async (link) => {
        const pt = track.platformTracks.find((p) => p.platform === link.platform);
        if (!pt?.platformTrackId || !link.platformPlaylistId) return;
        try {
          const { accessToken } = await getValidAccessToken(userId, link.platform);
          await getAdapter(link.platform).removeTracks(accessToken, link.platformPlaylistId, [pt.platformTrackId]);
        } catch {
          // Non-critical — track is still removed from Syncify
        }
      }),
    );

    await prisma.playlistTrack.delete({ where: { id: trackId } });

    // Reindex positions
    const remaining = await prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((t, i) => prisma.playlistTrack.update({ where: { id: t.id }, data: { position: i } })),
    );
  }

  async retryFailed(userId: string, playlistId: string) {
    await this.assertOwner(userId, playlistId);
    // Reset all NOT_FOUND and FAILED platform tracks back to PENDING
    const result = await prisma.platformTrack.updateMany({
      where: {
        playlistTrack: { playlistId },
        status: { in: ['NOT_FOUND', 'FAILED'] },
      },
      data: { status: 'PENDING' },
    });
    if (result.count > 0) {
      await addSyncJob({ playlistId, userId, triggeredBy: 'MANUAL' });
    }
    return { retried: result.count };
  }

  async manualMatch(
    userId: string,
    playlistId: string,
    trackId: string,
    platform: 'SPOTIFY' | 'YOUTUBE',
    platformTrackId: string,
  ) {
    await this.assertOwner(userId, playlistId);
    const track = await prisma.playlistTrack.findUnique({ where: { id: trackId } });
    if (!track || track.playlistId !== playlistId) throw new AppError(404, 'Track not found');

    await prisma.platformTrack.updateMany({
      where: { playlistTrackId: trackId, platform },
      data: { platformTrackId, status: 'PENDING' },
    });

    await addSyncJob({ playlistId, userId, triggeredBy: 'MANUAL' });
  }

  private async assertOwner(userId: string, playlistId: string) {
    const p = await prisma.playlist.findUnique({ where: { id: playlistId }, select: { userId: true } });
    if (!p) throw new AppError(404, 'Playlist not found');
    if (p.userId !== userId) throw new AppError(403, 'Forbidden');
  }
}

export const tracksService = new TracksService();
