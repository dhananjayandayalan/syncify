import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { RegisterBody, LoginBody, RefreshBody, OAuthCallbackQuery } from './auth.schemas';
import { authService } from './auth.service';
import { oauthService } from './oauth.service';
import { env, appleMusicEnabled } from '../../config/env';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 30 * 24 * 60 * 60,
};

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    schema: { body: RegisterBody },
  }, async (req, reply) => {
    const { user, connections, rawRefreshToken } = await authService.register(req.body.name, req.body.email, req.body.password);
    const accessToken = app.jwt.sign({ userId: user.id });
    reply.setCookie('refreshToken', rawRefreshToken, COOKIE_OPTS);
    return reply.code(201).send({ accessToken, user, connections, features: { appleMusicEnabled } });
  });

  server.post('/login', {
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    schema: { body: LoginBody },
  }, async (req, reply) => {
    const { user, connections, rawRefreshToken } = await authService.login(req.body.email, req.body.password);
    const accessToken = app.jwt.sign({ userId: user.id });
    reply.setCookie('refreshToken', rawRefreshToken, COOKIE_OPTS);
    return { accessToken, user, connections, features: { appleMusicEnabled } };
  });

  server.post('/refresh', {
    schema: { body: RefreshBody },
  }, async (req, reply) => {
    const rawToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
    if (!rawToken) return reply.code(401).send({ error: 'unauthorized', message: 'No refresh token' });

    const { userId, newRawToken } = await authService.validateRefreshToken(rawToken);
    const accessToken = app.jwt.sign({ userId });
    reply.setCookie('refreshToken', newRawToken, COOKIE_OPTS);
    return { accessToken };
  });

  server.post('/logout', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) await authService.logout(rawToken);
    reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    return reply.code(204).send();
  });

  server.get('/me', {
    preHandler: [app.authenticate],
  }, async (req) => {
    const result = await authService.getMe(req.user.userId);
    return { ...result, features: { appleMusicEnabled } };
  });

  server.get('/spotify/authorize', {
    preHandler: [app.authenticate],
  }, async (req) => {
    return oauthService.getSpotifyAuthUrl(req.user.userId);
  });

  server.get('/spotify/callback', {
    schema: { querystring: OAuthCallbackQuery },
  }, async (req, reply) => {
    try {
      await oauthService.handleSpotifyCallback(req.query.code, req.query.state);
      return reply.redirect(`${env.FRONTEND_URL}/oauth/callback?platform=spotify&success=true`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.redirect(
        `${env.FRONTEND_URL}/oauth/callback?platform=spotify&success=false&error=${encodeURIComponent(msg)}`,
      );
    }
  });

  server.delete('/spotify/disconnect', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    await oauthService.disconnect(req.user.userId, 'SPOTIFY');
    return reply.code(204).send();
  });

  server.get('/youtube/authorize', {
    preHandler: [app.authenticate],
  }, async (req) => {
    return oauthService.getYouTubeAuthUrl(req.user.userId);
  });

  server.get('/youtube/callback', {
    schema: { querystring: OAuthCallbackQuery },
  }, async (req, reply) => {
    try {
      await oauthService.handleYouTubeCallback(req.query.code, req.query.state);
      return reply.redirect(`${env.FRONTEND_URL}/oauth/callback?platform=youtube&success=true`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.redirect(
        `${env.FRONTEND_URL}/oauth/callback?platform=youtube&success=false&error=${encodeURIComponent(msg)}`,
      );
    }
  });

  server.delete('/youtube/disconnect', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    await oauthService.disconnect(req.user.userId, 'YOUTUBE');
    return reply.code(204).send();
  });

  server.get('/apple-music/developer-token', {
    preHandler: [app.authenticate],
  }, async (_req, reply) => {
    if (!appleMusicEnabled) return reply.code(503).send({ error: 'Apple Music is not configured on this server' });
    return oauthService.getAppleMusicDeveloperToken();
  });

  server.post('/apple-music/connect', {
    preHandler: [app.authenticate],
    schema: { body: z.object({ musicUserToken: z.string().min(10) }) },
  }, async (req, reply) => {
    if (!appleMusicEnabled) return reply.code(503).send({ error: 'Apple Music is not configured on this server' });
    await oauthService.connectAppleMusic(req.user.userId, req.body.musicUserToken);
    return reply.code(200).send({ success: true });
  });

  server.delete('/apple-music/disconnect', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    await oauthService.disconnect(req.user.userId, 'APPLE_MUSIC');
    return reply.code(204).send();
  });
}
