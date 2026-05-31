import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

export async function getLogs(
  userId: string,
  playlistId: string,
  platform?: string,
  limit = 50,
  offset = 0,
) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });
  if (!playlist) throw new AppError(404, 'Playlist not found');
  if (playlist.userId !== userId) throw new AppError(403, 'Forbidden');

  const where: Record<string, unknown> = { playlistId };
  if (platform) where.platform = platform;

  const [logs, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.syncLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}
