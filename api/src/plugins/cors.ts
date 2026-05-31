import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env';

export default fp(async (app) => {
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
});
