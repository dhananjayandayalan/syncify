import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AddTrackBody, PlaylistIdParam, TrackParam } from './tracks.schemas';
import { tracksService } from './tracks.service';

export async function tracksRoutes(app: FastifyInstance): Promise<void> {
  const s = app.withTypeProvider<ZodTypeProvider>();

  s.get('/:id/tracks', {
    preHandler: [app.authenticate],
    schema: { params: PlaylistIdParam },
  }, async (req) => {
    return { tracks: await tracksService.list(req.user.userId, req.params.id) };
  });

  s.post('/:id/tracks', {
    preHandler: [app.authenticate],
    schema: { params: PlaylistIdParam, body: AddTrackBody },
  }, async (req, reply) => {
    const track = await tracksService.add(req.user.userId, req.params.id, req.body);
    return reply.code(201).send({ track });
  });

  s.delete('/:id/tracks/:trackId', {
    preHandler: [app.authenticate],
    schema: { params: TrackParam },
  }, async (req, reply) => {
    await tracksService.remove(req.user.userId, req.params.id, req.params.trackId);
    return reply.code(204).send();
  });
}
