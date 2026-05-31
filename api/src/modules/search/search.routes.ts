import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { searchSpotify } from './search.service';

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  const s = app.withTypeProvider<ZodTypeProvider>();

  s.get('/', {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      querystring: z.object({
        q: z.string().min(1).max(100),
        market: z.string().length(2).toUpperCase().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
  }, async (req) => {
    const { q, market, limit, offset } = req.query;
    return searchSpotify(req.user.userId, q, market, limit, offset);
  });
}
