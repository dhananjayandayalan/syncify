import { z } from 'zod';

const PlatformEnum = z.enum(['SPOTIFY', 'YOUTUBE']);

export const CreatePlaylistBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  platforms: z.array(PlatformEnum).optional(),
});

export const UpdatePlaylistBody = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(300).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const PlaylistIdParam = z.object({ id: z.string().cuid() });

export const DeletePlaylistQuery = z.object({
  platforms: z.array(PlatformEnum).optional(),
});

export const LinkPlatformBody = z.object({ platform: PlatformEnum });

export const UnlinkPlatformParam = z.object({
  id: z.string().cuid(),
  platform: PlatformEnum,
});
