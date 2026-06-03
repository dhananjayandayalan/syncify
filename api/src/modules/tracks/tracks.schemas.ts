import { z } from 'zod';

export const AddTrackBody = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  isrc: z.string().optional(),
  durationMs: z.number().int().positive().optional(),
  spotifyTrackId: z.string().min(1),
});

export const PlaylistIdParam = z.object({ id: z.string().cuid() });

export const TrackParam = z.object({
  id: z.string().cuid(),
  trackId: z.string().cuid(),
});

export const ManualMatchBody = z.object({
  platform: z.enum(['SPOTIFY', 'YOUTUBE']),
  platformTrackId: z.string().min(1),
});
