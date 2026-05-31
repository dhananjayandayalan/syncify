import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
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

    return prisma.playlistLink.upsert({
      where: { playlistId_platform: { playlistId, platform } },
      create: { playlistId, platform, isActive: true },
      update: { isActive: true },
    });
  }

  async unlinkPlatform(userId: string, playlistId: string, platform: Platform) {
    await this.assertOwner(userId, playlistId);
    await prisma.playlistLink.deleteMany({ where: { playlistId, platform } });
  }

  private async assertOwner(userId: string, playlistId: string) {
    const p = await prisma.playlist.findUnique({ where: { id: playlistId }, select: { userId: true } });
    if (!p) throw new AppError(404, 'Playlist not found');
    if (p.userId !== userId) throw new AppError(403, 'Forbidden');
  }
}

export const playlistsService = new PlaylistsService();
