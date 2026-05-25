import { Router } from 'express';
import { google } from 'googleapis';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/api/auth/calendar/callback`
  );
}

async function getAuthedClient(userId: string) {
  const token = await prisma.calendarToken.findUnique({ where: { userId } });
  if (!token) throw new Error('No calendar token');

  const client = oauthClient();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  // Auto-refresh if expiring within 5 min
  if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.calendarToken.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

// ── Save tokens (called by frontend after NextAuth calendar consent) ──────────
calendarRouter.post('/token', async (req: AuthRequest, res) => {
  try {
    const { accessToken, refreshToken, expiresAt, scope } = z
      .object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.string().datetime(),
        scope: z.string(),
      })
      .parse(req.body);

    const stored = await prisma.calendarToken.upsert({
      where: { userId: req.userId! },
      update: { accessToken, refreshToken, expiresAt: new Date(expiresAt), scope },
      create: { userId: req.userId!, accessToken, refreshToken, expiresAt: new Date(expiresAt), scope },
    });

    res.json({ ok: true, id: stored.id });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── Create calendar event for a completed session ─────────────────────────────
calendarRouter.post('/event', async (req: AuthRequest, res) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);

    const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== req.userId!) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (!session.exitTime) {
      return res.status(400).json({ error: 'Session still active' });
    }

    const authClient = await getAuthedClient(req.userId!);
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const mins = session.durationMinutes ?? 0;
    const h = Math.floor(mins / 60);
    const m = mins % 60;

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: '📚 Study Session',
        description: `Studied in Our Study Library\nDuration: ${h}h ${m}m\nPomodoros: ${session.pomodoroCount}`,
        start: { dateTime: session.entryTime.toISOString() },
        end: { dateTime: session.exitTime.toISOString() },
        colorId: '5', // banana yellow
      },
    });

    await prisma.studySession.update({
      where: { id: sessionId },
      data: { calendarEventId: event.data.id },
    });

    res.json({ eventId: event.data.id, htmlLink: event.data.htmlLink });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Status – does the user have a token? ─────────────────────────────────────
calendarRouter.get('/status', async (req: AuthRequest, res) => {
  const token = await prisma.calendarToken.findUnique({ where: { userId: req.userId! } });
  res.json({ connected: !!token });
});
