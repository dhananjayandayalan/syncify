import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';

const tls = env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined;

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls,
});

export interface SyncJobData {
  playlistId: string;
  userId: string;
  platforms?: ('SPOTIFY' | 'YOUTUBE')[];
  triggeredBy: 'MANUAL' | 'POLLING';
}

export const syncQueue = new Queue<SyncJobData>('playlist-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: true,
    removeOnFail: true,
  },
});

// Deduplicated sync trigger — only one sync job per playlist can be queued or active at a time.
// BullMQ won't add a second job with the same jobId while the first is waiting/active.
// removeOnComplete: true ensures completed jobs are removed immediately so the next
// trigger can be queued after the current one finishes.
export async function addSyncJob(data: SyncJobData) {
  return syncQueue.add('sync', data, {
    jobId: `sync-${data.playlistId}`,
  });
}
