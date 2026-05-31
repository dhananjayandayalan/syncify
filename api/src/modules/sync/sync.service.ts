import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { syncQueue } from '../../jobs/queue';

export async function triggerSync(userId: string, playlistId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });
  if (!playlist) throw new AppError(404, 'Playlist not found');
  if (playlist.userId !== userId) throw new AppError(403, 'Forbidden');

  const job = await syncQueue.add('sync', { playlistId, userId, triggeredBy: 'MANUAL' });
  return { jobId: job.id };
}
