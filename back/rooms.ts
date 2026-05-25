import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const roomsRouter = Router();
roomsRouter.use(requireAuth);

// ── Create room ──────────────────────────────────────────────────────────────
roomsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { name } = z.object({ name: z.string().max(60).optional() }).parse(req.body);
    const code = nanoid(6).toUpperCase();

    const room = await prisma.room.create({
      data: {
        code,
        name: name ?? 'Our Study Library',
        ownerId: req.userId!,
        members: { create: { userId: req.userId!, role: 'owner' } },
      },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json(room);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── Join room by code ────────────────────────────────────────────────────────
roomsRouter.post('/join', async (req: AuthRequest, res) => {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Upsert membership
    await prisma.roomMember.upsert({
      where: { userId_roomId: { userId: req.userId!, roomId: room.id } },
      update: {},
      create: { userId: req.userId!, roomId: room.id },
    });

    const full = await prisma.room.findUnique({
      where: { id: room.id },
      include: { members: { include: { user: true } } },
    });

    res.json(full);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── Get my rooms ─────────────────────────────────────────────────────────────
roomsRouter.get('/mine', async (req: AuthRequest, res) => {
  const memberships = await prisma.roomMember.findMany({
    where: { userId: req.userId! },
    include: { room: { include: { members: { include: { user: true } } } } },
    orderBy: { joinedAt: 'desc' },
  });
  res.json(memberships.map((m) => m.room));
});

// ── Get single room ──────────────────────────────────────────────────────────
roomsRouter.get('/:roomId', async (req: AuthRequest, res) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.roomId },
    include: { members: { include: { user: true } }, notes: true, todos: { include: { user: true } } },
  });
  if (!room) return res.status(404).json({ error: 'Not found' });

  // Must be a member
  const isMember = room.members.some((m) => m.userId === req.userId);
  if (!isMember) return res.status(403).json({ error: 'Forbidden' });

  res.json(room);
});

// ── Update shared note ───────────────────────────────────────────────────────
roomsRouter.put('/:roomId/note', async (req: AuthRequest, res) => {
  const { content } = z.object({ content: z.string().max(10000) }).parse(req.body);

  const note = await prisma.sharedNote.upsert({
    where: { roomId: req.params.roomId },
    update: { content },
    create: { roomId: req.params.roomId, content },
  });
  res.json(note);
});

// ── Todo CRUD ────────────────────────────────────────────────────────────────
roomsRouter.post('/:roomId/todos', async (req: AuthRequest, res) => {
  const { text } = z.object({ text: z.string().max(200) }).parse(req.body);
  const todo = await prisma.todo.create({
    data: { roomId: req.params.roomId, userId: req.userId!, text },
    include: { user: true },
  });
  res.status(201).json(todo);
});

roomsRouter.patch('/:roomId/todos/:todoId', async (req: AuthRequest, res) => {
  const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
  const todo = await prisma.todo.update({
    where: { id: req.params.todoId },
    data: { completed, completedAt: completed ? new Date() : null },
    include: { user: true },
  });
  res.json(todo);
});

roomsRouter.delete('/:roomId/todos/:todoId', async (req: AuthRequest, res) => {
  await prisma.todo.delete({ where: { id: req.params.todoId } });
  res.status(204).end();
});
