import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreatePlaylistBody,
  UpdatePlaylistBody,
  PlaylistIdParam,
  DeletePlaylistQuery,
  LinkPlatformBody,
  UnlinkPlatformParam,
} from './playlists.schemas';
import { playlistsService } from './playlists.service';

export async function playlistRoutes(app: FastifyInstance): Promise<void> {
  const s = app.withTypeProvider<ZodTypeProvider>();

  s.get('/', { preHandler: [app.authenticate] }, async (req) => {
    return { playlists: await playlistsService.list(req.user.userId) };
  });

  s.post('/', {
    preHandler: [app.authenticate],
    schema: { body: CreatePlaylistBody },
  }, async (req, reply) => {
    const { name, description, platforms } = req.body;
    const playlist = await playlistsService.create(req.user.userId, name, description, platforms as any);
    return reply.code(201).send({ playlist });
  });

  s.get('/:id', {
    preHandler: [app.authenticate],
    schema: { params: PlaylistIdParam },
  }, async (req) => {
    return { playlist: await playlistsService.get(req.user.userId, req.params.id) };
  });

  s.patch('/:id', {
    preHandler: [app.authenticate],
    schema: { params: PlaylistIdParam, body: UpdatePlaylistBody },
  }, async (req) => {
    return { playlist: await playlistsService.update(req.user.userId, req.params.id, req.body) };
  });

  s.delete('/:id', {
    preHandler: [app.authenticate],
    schema: { params: PlaylistIdParam, querystring: DeletePlaylistQuery },
  }, async (req, reply) => {
    await playlistsService.delete(req.user.userId, req.params.id);
    return reply.code(204).send();
  });

  s.post('/:id/links', {
    preHandler: [app.authenticate],
    schema: { params: PlaylistIdParam, body: LinkPlatformBody },
  }, async (req, reply) => {
    const link = await playlistsService.linkPlatform(req.user.userId, req.params.id, req.body.platform as any);
    return reply.code(201).send({ link });
  });

  s.delete('/:id/links/:platform', {
    preHandler: [app.authenticate],
    schema: { params: UnlinkPlatformParam },
  }, async (req, reply) => {
    await playlistsService.unlinkPlatform(req.user.userId, req.params.id, req.params.platform as any);
    return reply.code(204).send();
  });
}
