import Redis from 'ioredis';
import { env } from '../config/env';

const tls = env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined;

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls,
});
