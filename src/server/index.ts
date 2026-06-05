import http from 'http';
import express from 'express';
import { env } from '../env';
import { serverEvents } from '../events';
import { prisma } from '../db/client';
import { createApiRouter } from '../api/routes/polls';
import { createAuthRouter } from '../api/routes/auth';
import { setupWSHandler, wssSend, wssBroadcast } from './ws/handlers';

export function startServer(): void {
  const app = express();
  app.use(express.json());

  // CORS middleware for frontend access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api', createApiRouter());

  // Bun native WebSocket server
  Bun.serve({
    port: env.WS_PORT,
    fetch(req, server) {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response('Upgrade Required', { status: 426 });
    },
    websocket: setupWSHandler(),
  });

  // HTTP server for REST API
  const httpServer = http.createServer(app);
  httpServer.listen(env.PORT, () => {
    console.log(`HTTP server listening on port ${env.PORT}`);
    // Auto-end any LIVE polls whose scheduledEnd has passed (server restart recovery)
    endOverdueLivePolls();
  });

  // Event → WS broadcast bridge
  serverEvents.on('poll:update', async (data: { pollId: string }) => {
    const poll = await prisma.poll.findUnique({
      where: { id: data.pollId },
      include: { options: true, runs: { include: { votes: true } } },
    });
    if (poll) {
      wssBroadcast({ type: 'poll:update', payload: poll });
    }
  });

  serverEvents.on('vote', async (data: { pollId: string; option: number; userId: string }) => {
    const poll = await prisma.poll.findFirst({
      where: { channelId: data.pollId, status: 'LIVE' },
    });
    if (!poll) return;

    const liveRun = await prisma.pollRun.findFirst({
      where: { pollId: poll.id, status: 'LIVE' },
    });
    if (!liveRun) return;

    await prisma.vote.create({
      data: { pollId: poll.id, runId: liveRun.id, option: data.option, userId: data.userId },
    });

    serverEvents.emit('poll:update', { pollId: poll.id });
  });

  serverEvents.on('poll:started', (data: { pollId: string }) => {
    wssBroadcast({ type: 'poll:started', payload: { pollId: data.pollId } });
  });

  serverEvents.on('poll:ended', async (data: { pollId: string }) => {
    const poll = await prisma.poll.findUnique({
      where: { id: data.pollId },
      include: { options: true, runs: { include: { votes: true } } },
    });
    if (poll) {
      wssBroadcast({ type: 'poll:ended', payload: poll });
    }
  });
}

// On server start, end any LIVE polls whose scheduledEnd has passed (timer recovery)
async function endOverdueLivePolls(): Promise<void> {
  try {
    const overdueRuns = await prisma.pollRun.findMany({
      where: {
        status: 'LIVE',
        scheduledEnd: { lte: new Date() },
      },
    });

    for (const run of overdueRuns) {
      await prisma.pollRun.update({
        where: { id: run.id },
        data: { status: 'ENDED' },
      });
      await prisma.poll.update({
        where: { id: run.pollId },
        data: { status: 'ENDED' },
      });
      serverEvents.emit('poll:ended', { pollId: run.pollId });
      console.log(`Auto-ended overdue poll run ${run.id} (run #${run.runNumber})`);
    }

    if (overdueRuns.length > 0) {
      console.log(`Ended ${overdueRuns.length} overdue poll run(s) on server restart`);
    }
  } catch (error) {
    console.error('Failed to auto-end overdue polls:', error);
  }
}
