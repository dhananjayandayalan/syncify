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
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
