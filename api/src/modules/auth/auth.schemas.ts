import { z } from 'zod';

export const RegisterBody = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshBody = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const OAuthCallbackQuery = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
