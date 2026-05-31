import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { env } from './config/env';
import { registerPlugins } from './plugins';
import { AppError } from './lib/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { playlistRoutes } from './modules/playlists/playlists.routes';
import { tracksRoutes } from './modules/tracks/tracks.routes';
import { searchRoutes } from './modules/search/search.routes';
import { syncRoutes } from './modules/sync/sync.routes';
import { logsRoutes } from './modules/logs/logs.routes';

export async function buildServer() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await registerPlugins(app);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation error', details: err.flatten() });
    }
    if ('validation' in err && err.validation) {
      return reply.code(400).send({ error: 'Validation error', details: err.message });
    }
    app.log.error(err);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(searchRoutes, { prefix: '/api/v1/search' });
  await app.register(playlistRoutes, { prefix: '/api/v1/playlists' });
  await app.register(tracksRoutes, { prefix: '/api/v1/playlists' });
  await app.register(syncRoutes, { prefix: '/api/v1/playlists' });
  await app.register(logsRoutes, { prefix: '/api/v1/playlists' });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}

async function start() {
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
