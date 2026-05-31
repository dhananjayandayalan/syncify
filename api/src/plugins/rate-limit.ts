import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (app) => {
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) =>
      (request.headers['x-forwarded-for'] as string) ?? request.ip,
  });
});
