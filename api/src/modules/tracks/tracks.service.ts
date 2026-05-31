import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { syncQueue } from '../../jobs/queue';

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
      await syncQueue.add('sync', { playlistId, userId, triggeredBy: 'MANUAL' });
    }

    return track;
  }

  async remove(userId: string, playlistId: string, trackId: string) {
    await this.assertOwner(userId, playlistId);

    const track = await prisma.playlistTrack.findUnique({ where: { id: trackId } });
    if (!track || track.playlistId !== playlistId) throw new AppError(404, 'Track not found');

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

  private async assertOwner(userId: string, playlistId: string) {
    const p = await prisma.playlist.findUnique({ where: { id: playlistId }, select: { userId: true } });
    if (!p) throw new AppError(404, 'Playlist not found');
    if (p.userId !== userId) throw new AppError(403, 'Forbidden');
  }
}

export const tracksService = new TracksService();
