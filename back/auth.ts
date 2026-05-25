import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;

/** Verify JWT issued by the frontend (NextAuth) and attach userId */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };

    // Confirm user exists in DB
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
