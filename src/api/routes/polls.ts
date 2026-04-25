import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { authMiddleware, writeAuthMiddleware } from '../middleware/auth';
import { serverEvents } from '../../events';

const OptionInputSchema = z.object({
  number: z.number().int().min(1).max(9),
  label: z.string().min(1),
  image: z.string().optional(),
});

const CreatePollSchema = z.object({
  question: z.string().min(1),
  channelId: z.string().min(1),
  guildId: z.string().min(1),
  liveTheme: z.string().default('bar'),
  resultTheme: z.string().default('bar'),
  options: z.array(OptionInputSchema).min(1).max(9),
});

const UpdatePollSchema = z.object({
  question: z.string().min(1).optional(),
  liveTheme: z.string().optional(),
  resultTheme: z.string().optional(),
  status: z.enum(['DRAFT', 'LIVE', 'ENDED']).optional(),
  options: z.array(OptionInputSchema).optional(),
});

export function createApiRouter(): Router {
  const router = Router();

  router.get('/polls', authMiddleware, async (_req: Request, res: Response) => {
    try {
      const polls = await prisma.poll.findMany({
        include: {
          options: true,
          votes: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(polls);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch polls' });
    }
  });

  router.post('/polls', writeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const data = CreatePollSchema.parse(req.body);
      const userId = req.headers['x-user-id'] as string;

      const poll = await prisma.poll.create({
        data: {
          question: data.question,
          channelId: data.channelId,
          guildId: data.guildId,
          liveTheme: data.liveTheme,
          resultTheme: data.resultTheme,
          ownerId: userId,
          options: {
            create: data.options.map((opt) => ({
              number: opt.number,
              label: opt.label,
              image: opt.image,
            })),
          },
        },
        include: {
          options: true,
        },
      });

      res.status(201).json(poll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create poll' });
    }
  });

  router.get('/polls/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const pollId = req.params.id as string;
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: true,
          votes: true,
        },
      });

      if (!poll) {
        res.status(404).json({ error: 'Poll not found' });
        return;
      }

      res.json(poll);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch poll' });
    }
  });

  router.put('/polls/:id', writeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const data = UpdatePollSchema.parse(req.body);
      const pollId = req.params.id as string;

      const existingPoll = await prisma.poll.findUnique({
        where: { id: pollId },
      });

      if (!existingPoll) {
        res.status(404).json({ error: 'Poll not found' });
        return;
      }

      const poll = await prisma.poll.update({
        where: { id: pollId },
        data: {
          question: data.question,
          liveTheme: data.liveTheme,
          resultTheme: data.resultTheme,
          status: data.status,
        },
        include: {
          options: true,
          votes: true,
        },
      });

      res.json(poll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to update poll' });
    }
  });

  router.delete('/polls/:id', writeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const pollId = req.params.id as string;
      await prisma.poll.delete({
        where: { id: pollId },
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete poll' });
    }
  });

  router.post('/polls/:id/start', writeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const pollId = req.params.id as string;
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        res.status(404).json({ error: 'Poll not found' });
        return;
      }

      if (poll.status === 'LIVE') {
        res.status(400).json({ error: 'Poll is already live' });
        return;
      }

      const updatedPoll = await prisma.poll.update({
        where: { id: pollId },
        data: { status: 'LIVE' },
        include: {
          options: true,
          votes: true,
        },
      });

      serverEvents.emit('poll:started', { pollId: poll.id });
      serverEvents.emit('poll:update', { pollId: poll.id });

      res.json(updatedPoll);
    } catch (error) {
      res.status(500).json({ error: 'Failed to start poll' });
    }
  });

  router.post('/polls/:id/end', writeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const pollId = req.params.id as string;
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!poll) {
        res.status(404).json({ error: 'Poll not found' });
        return;
      }

      if (poll.status === 'ENDED') {
        res.status(400).json({ error: 'Poll has already ended' });
        return;
      }

      const updatedPoll = await prisma.poll.update({
        where: { id: pollId },
        data: { status: 'ENDED' },
        include: {
          options: true,
          votes: true,
        },
      });

      serverEvents.emit('poll:ended', { pollId: poll.id });

      res.json(updatedPoll);
    } catch (error) {
      res.status(500).json({ error: 'Failed to end poll' });
    }
  });

  router.post('/polls/:id/import', writeAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const pollId = req.params.id as string;
      const sourcePoll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
      });

      if (!sourcePoll) {
        res.status(404).json({ error: 'Poll not found' });
        return;
      }

      const userId = req.headers['x-user-id'] as string;

      const newPoll = await prisma.poll.create({
        data: {
          question: sourcePoll.question,
          channelId: sourcePoll.channelId,
          guildId: sourcePoll.guildId,
          liveTheme: sourcePoll.liveTheme,
          resultTheme: sourcePoll.resultTheme,
          ownerId: userId,
          options: {
            create: sourcePoll.options.map((opt) => ({
              number: opt.number,
              label: opt.label,
              image: opt.image,
            })),
          },
        },
        include: {
          options: true,
        },
      });

      res.status(201).json(newPoll);
    } catch (error) {
      res.status(500).json({ error: 'Failed to import poll' });
    }
  });

  return router;
}