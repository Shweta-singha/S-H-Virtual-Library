import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

// ── Start session ────────────────────────────────────────────────────────────
sessionsRouter.post('/start', async (req: AuthRequest, res) => {
  try {
    const { roomId } = z.object({ roomId: z.string() }).parse(req.body);

    // Close any dangling open sessions first
    await prisma.studySession.updateMany({
      where: { userId: req.userId!, exitTime: null },
      data: { exitTime: new Date(), durationMinutes: 0 },
    });

    const session = await prisma.studySession.create({
      data: {
        userId: req.userId!,
        roomId,
        entryTime: new Date(),
        date: new Date(),
      },
    });

    res.status(201).json(session);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── End session ──────────────────────────────────────────────────────────────
sessionsRouter.post('/end', async (req: AuthRequest, res) => {
  try {
    const { sessionId, pomodoroCount, notes } = z
      .object({
        sessionId: z.string(),
        pomodoroCount: z.number().int().min(0).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);

    const existing = await prisma.studySession.findUnique({ where: { id: sessionId } });
    if (!existing || existing.userId !== req.userId!) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (existing.exitTime) {
      return res.status(400).json({ error: 'Session already ended' });
    }

    const exitTime = new Date();
    const durationMinutes = Math.round(
      (exitTime.getTime() - existing.entryTime.getTime()) / 60000
    );

    const session = await prisma.studySession.update({
      where: { id: sessionId },
      data: { exitTime, durationMinutes, pomodoroCount, notes },
    });

    res.json(session);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── Get active session ───────────────────────────────────────────────────────
sessionsRouter.get('/active', async (req: AuthRequest, res) => {
  const session = await prisma.studySession.findFirst({
    where: { userId: req.userId!, exitTime: null },
  });
  res.json(session ?? null);
});

// ── Get session history ──────────────────────────────────────────────────────
sessionsRouter.get('/history', async (req: AuthRequest, res) => {
  const { roomId, limit } = req.query;
  const sessions = await prisma.studySession.findMany({
    where: {
      userId: req.userId!,
      ...(roomId ? { roomId: String(roomId) } : {}),
      exitTime: { not: null },
    },
    orderBy: { entryTime: 'desc' },
    take: limit ? parseInt(String(limit)) : 50,
  });
  res.json(sessions);
});
