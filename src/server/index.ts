import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from '../env';
import { setupWSHandlers, connectedClients } from './ws/handlers';
import { createApiRouter } from '../api/routes/polls';
import { serverEvents } from '../events';
import { prisma } from '../db/client';

export function startServer(): void {
  const app = express();
  app.use(express.json());

  app.use('/api', createApiRouter());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  setupWSHandlers(wss);

  serverEvents.on('poll:update', async (data: { pollId: string }) => {
    const poll = await prisma.poll.findUnique({
      where: { id: data.pollId },
      include: {
        options: true,
        votes: true,
      },
    });

    if (poll) {
      const message = JSON.stringify({
        type: 'poll:update',
        payload: poll,
      });

      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  serverEvents.on('vote', (data: { pollId: string; option: number; userId: string }) => {
    prisma.vote.upsert({
      where: {
        pollId_userId: {
          pollId: data.pollId,
          userId: data.userId,
        },
      },
      update: {
        option: data.option,
      },
      create: {
        pollId: data.pollId,
        option: data.option,
        userId: data.userId,
      },
    }).then(() => {
      serverEvents.emit('poll:update', { pollId: data.pollId });
    });
  });

  serverEvents.on('poll:started', (data: { pollId: string }) => {
    const message = JSON.stringify({
      type: 'poll:started',
      payload: { pollId: data.pollId },
    });

    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  serverEvents.on('poll:ended', async (data: { pollId: string }) => {
    const poll = await prisma.poll.findUnique({
      where: { id: data.pollId },
      include: {
        options: true,
        votes: true,
      },
    });

    const message = JSON.stringify({
      type: 'poll:ended',
      payload: poll,
    });

    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  server.listen(env.PORT, () => {
    console.log(`HTTP server listening on port ${env.PORT}`);
  });

  server.listen(env.WS_PORT, () => {
    console.log(`WebSocket server listening on port ${env.WS_PORT}`);
  });
}