import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { syncQueue } from '../../jobs/queue';
import type { Platform } from '../../platforms/platform.types';

class PlaylistsService {
  async list(userId: string) {
    return prisma.playlist.findMany({
      where: { userId },
      include: {
        links: { select: { platform: true, isActive: true, platformPlaylistId: true, lastSyncedAt: true } },
        _count: { select: { tracks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, name: string, description?: string, platforms?: Platform[]) {
    return prisma.playlist.create({
      data: {
        userId,
        name,
        description,
        links: platforms?.length ? { create: platforms.map((platform) => ({ platform })) } : undefined,
      },
      include: {
        links: { select: { platform: true, isActive: true, platformPlaylistId: true, lastSyncedAt: true } },
        _count: { select: { tracks: true } },
      },
    });
  }

  async get(userId: string, playlistId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        links: true,
        tracks: { include: { platformTracks: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!playlist) throw new AppError(404, 'Playlist not found');
    if (playlist.userId !== userId) throw new AppError(403, 'Forbidden');
    return playlist;
  }

  async update(userId: string, playlistId: string, data: { name?: string; description?: string }) {
    await this.assertOwner(userId, playlistId);
    return prisma.playlist.update({
      where: { id: playlistId },
      data,
      include: {
        links: { select: { platform: true, isActive: true, platformPlaylistId: true, lastSyncedAt: true } },
        _count: { select: { tracks: true } },
      },
    });
  }

  async delete(userId: string, playlistId: string) {
    await this.assertOwner(userId, playlistId);
    await prisma.playlist.delete({ where: { id: playlistId } });
  }

  async linkPlatform(userId: string, playlistId: string, platform: Platform) {
    await this.assertOwner(userId, playlistId);
    const conn = await prisma.platformConnection.findUnique({
      where: { userId_platform: { userId, platform } },
    });
    if (!conn) throw new AppError(400, `Connect your ${platform} account first`);

    const link = await prisma.playlistLink.upsert({
      where: { playlistId_platform: { playlistId, platform } },
      create: { playlistId, platform, isActive: true },
      update: { isActive: true },
    });

    // Backfill PENDING PlatformTrack rows for any tracks that don't have one for this platform
    const tracks = await prisma.playlistTrack.findMany({
      where: { playlistId },
      include: { platformTracks: { where: { platform } } },
    });
    const unlinked = tracks.filter((t) => t.platformTracks.length === 0);
    if (unlinked.length > 0) {
      await prisma.platformTrack.createMany({
        data: unlinked.map((t) => ({
          playlistTrackId: t.id,
          platform,
          status: 'PENDING' as const,
        })),
      });
    }

    // Always trigger a sync — even for empty playlists — so the platform playlist
    // gets created immediately and platformPlaylistId is written to the DB.
    // Without this, polling has nothing to fetch from.
    await syncQueue.add('sync', { playlistId, userId, triggeredBy: 'MANUAL' });

    return link;
  }

  async unlinkPlatform(userId: string, playlistId: string, platform: Platform) {
    await this.assertOwner(userId, playlistId);
    await prisma.playlistLink.updateMany({
      where: { playlistId, platform },
      data: { isActive: false },
    });
  }

  private async assertOwner(userId: string, playlistId: string) {
    const p = await prisma.playlist.findUnique({ where: { id: playlistId }, select: { userId: true } });
    if (!p) throw new AppError(404, 'Playlist not found');
    if (p.userId !== userId) throw new AppError(403, 'Forbidden');
  }
}

export const playlistsService = new PlaylistsService();
