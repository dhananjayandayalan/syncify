import { prisma } from '../../db/client';
import { hashPassword, verifyPassword, generateToken, hashToken } from '../../crypto';
import { AppError } from '../../lib/errors';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface ConnectionDto {
  platform: string;
  platformUserId: string;
  market: string | null;
  connectedAt: Date;
}

const USER_SELECT = { id: true, name: true, email: true, createdAt: true } as const;
const CONN_SELECT = { platform: true, platformUserId: true, market: true, createdAt: true } as const;

class AuthService {
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: UserDto; connections: ConnectionDto[]; rawRefreshToken: string }> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: USER_SELECT,
    });

    const rawRefreshToken = generateToken();
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawRefreshToken), expiresAt: addDays(new Date(), 30) },
    });

    return { user, connections: [], rawRefreshToken };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: UserDto; connections: ConnectionDto[]; rawRefreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...USER_SELECT, passwordHash: true, connections: { select: CONN_SELECT } },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }

    const rawRefreshToken = generateToken();
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawRefreshToken), expiresAt: addDays(new Date(), 30) },
    });

    const { passwordHash: _, connections, ...userDto } = user;
    return { user: userDto, connections: connections.map((c) => ({ ...c, connectedAt: c.createdAt })), rawRefreshToken };
  }

  async validateRefreshToken(rawToken: string): Promise<{ userId: string; newRawToken: string }> {
    const tokenHash = hashToken(rawToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    await prisma.refreshToken.delete({ where: { tokenHash } });
    const newRawToken = generateToken();
    await prisma.refreshToken.create({
      data: { userId: stored.userId, tokenHash: hashToken(newRawToken), expiresAt: addDays(new Date(), 30) },
    });

    return { userId: stored.userId, newRawToken };
  }

  async logout(rawToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
  }

  async getMe(userId: string): Promise<{ user: UserDto; connections: ConnectionDto[] }> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ...USER_SELECT, connections: { select: CONN_SELECT } },
    });
    const { connections, ...userDto } = user;
    return {
      user: userDto,
      connections: connections.map((c) => ({ ...c, connectedAt: c.createdAt })),
    };
  }
}

export const authService = new AuthService();
