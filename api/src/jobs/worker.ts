import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { SyncJobData } from './queue';
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
  {
    connection,
    concurrency: 5,
  },
);

worker.on('completed', (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
  await worker.close();
});

console.log('[worker] Sync worker started');
