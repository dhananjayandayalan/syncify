import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../db/client';
import { env } from '../config/env';
import { syncQueue, SyncJobData } from './queue';
import { processSyncJob } from './sync.worker';

const QUEUE_NAME = 'playlist-sync';
const tls = env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined;
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls,
});

const worker = new Worker<SyncJobData>(
  QUEUE_NAME,
  processSyncJob,
  { connection, concurrency: 5 },
);

worker.on('completed', (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

// Only poll playlists that were accessed recently — keeps load proportional to active users
const ACTIVE_WINDOW_MS = 30 * 60 * 1000; // users active in the last 30 minutes

async function schedulePollingJobs() {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const links = await prisma.playlistLink.findMany({
    where: {
      isActive: true,
      // Only playlists synced or accessed recently
      OR: [
        { lastSyncedAt: { gte: since } },
        { lastSyncedAt: null }, // never synced — always include so first sync happens
      ],
    },
    select: { playlistId: true, playlist: { select: { userId: true } } },
    distinct: ['playlistId'],
  });

  for (const link of links) {
    await syncQueue.add('sync', {
      playlistId: link.playlistId,
      userId: link.playlist.userId,
      triggeredBy: 'POLLING',
    });
  }

  if (links.length > 0) {
    console.log(`[worker] Polling ${links.length} recently-active playlists`);
  }
}

const pollInterval = setInterval(schedulePollingJobs, env.POLL_INTERVAL_MS);

process.on('SIGTERM', async () => {
  clearInterval(pollInterval);
  await worker.close();
});

console.log(`[worker] Sync worker started — polling every ${env.POLL_INTERVAL_MS / 1000}s`);
