import { FastifyInstance } from 'fastify';
import corsPlugin from './cors';
import cookiePlugin from './cookie';
import jwtPlugin from './jwt';
import rateLimitPlugin from './rate-limit';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(corsPlugin);
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(rateLimitPlugin);
}
