import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { triggerSync } from './sync.service';

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  const s = app.withTypeProvider<ZodTypeProvider>();

  s.post('/:id/sync', {
    preHandler: [app.authenticate],
    schema: { params: z.object({ id: z.string().cuid() }) },
  }, async (req, reply) => {
    const result = await triggerSync(req.user.userId, req.params.id);
    return reply.code(202).send(result);
  });
}
