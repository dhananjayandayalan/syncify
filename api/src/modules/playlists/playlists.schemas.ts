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
    coverImage: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.name !== undefined || d.description !== undefined || d.coverImage !== undefined,
    { message: 'At least one field required' },
  );

export const PlaylistIdParam = z.object({ id: z.string().cuid() });

export const DeletePlaylistQuery = z.object({
  platforms: z.array(PlatformEnum).optional(),
});

export const LinkPlatformBody = z.object({ platform: PlatformEnum });

export const UnlinkPlatformParam = z.object({
  id: z.string().cuid(),
  platform: PlatformEnum,
});

export const PlatformQuery = z.object({ platform: PlatformEnum });

export const ImportPlaylistBody = z.object({
  platform: PlatformEnum,
  platformPlaylistId: z.string().min(1),
  name: z.string().min(1).max(100),
});
