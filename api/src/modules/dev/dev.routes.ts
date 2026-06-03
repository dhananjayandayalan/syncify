import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { syncQueue } from '../../jobs/queue';

export async function devRoutes(app: FastifyInstance): Promise<void> {
  // Returns full diagnostics: queue stats, failed jobs, recent error logs, platform health
  app.get('/diagnostics', { preHandler: [app.authenticate] }, async () => {
    const [counts, failedJobs, activeJobs, waitingJobs, errorLogs, platformStats] = await Promise.all([
      syncQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      syncQueue.getFailed(0, 19),
      syncQueue.getActive(),
      syncQueue.getWaiting(),
      prisma.syncLog.findMany({
        where: { status: { in: ['FAILED', 'NOT_FOUND'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          platform: true,
          status: true,
          action: true,
          message: true,
          trackTitle: true,
          trackArtist: true,
          triggeredBy: true,
          createdAt: true,
          playlist: { select: { id: true, name: true } },
        },
      }),
      prisma.platformConnection.groupBy({
        by: ['platform'],
        _count: { _all: true },
      }),
    ]);

    const expiredConnections = await prisma.platformConnection.findMany({
      where: { expiresAt: { lte: new Date(Date.now() + 5 * 60 * 1000) } },
      select: { platform: true, userId: true, expiresAt: true },
    });

    return {
      queue: {
        counts,
        active: activeJobs.map((j) => ({
          id: j.id,
          playlistId: j.data.playlistId,
          triggeredBy: j.data.triggeredBy,
          startedAt: j.processedOn ? new Date(j.processedOn).toISOString() : null,
        })),
        waiting: waitingJobs.map((j) => ({
          id: j.id,
          playlistId: j.data.playlistId,
          triggeredBy: j.data.triggeredBy,
          addedAt: new Date(j.timestamp).toISOString(),
        })),
        failed: failedJobs.map((j) => ({
          id: j.id,
          playlistId: j.data.playlistId,
          triggeredBy: j.data.triggeredBy,
          reason: j.failedReason,
          attemptsMade: j.attemptsMade,
          failedAt: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
        })),
      },
      errorLogs,
      platforms: {
        connections: platformStats.map((p) => ({ platform: p.platform, total: p._count._all })),
        expiringSoon: expiredConnections,
      },
    };
  });

  // Retry all failed jobs
  app.post('/retry-failed', { preHandler: [app.authenticate] }, async () => {
    const failed = await syncQueue.getFailed(0, 99);
    await Promise.all(failed.map((j) => j.retry()));
    return { retried: failed.length };
  });

  // Discard all failed jobs
  app.delete('/failed-jobs', { preHandler: [app.authenticate] }, async () => {
    const failed = await syncQueue.getFailed(0, 99);
    await Promise.all(failed.map((j) => j.remove()));
    return { removed: failed.length };
  });
}
