import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getLogs } from './logs.service';

export async function logsRoutes(app: FastifyInstance): Promise<void> {
  const s = app.withTypeProvider<ZodTypeProvider>();

  s.get('/:id/logs', {
    preHandler: [app.authenticate],
    schema: {
      params: z.object({ id: z.string().cuid() }),
      querystring: z.object({
        platform: z.enum(['SPOTIFY', 'YOUTUBE']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
  }, async (req) => {
    const { platform, limit, offset } = req.query;
    return getLogs(req.user.userId, req.params.id, platform, limit, offset);
  });
}
