import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { prisma } from '../../db/client';
import { authenticateClient, isWhitelisted } from './auth';
import { serverEvents } from '../../events';

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

interface AuthPayload {
  userId: string;
}

interface PollStartPayload extends AuthPayload {
  pollId: string;
}

interface PollEndPayload extends AuthPayload {
  pollId: string;
}

export const connectedClients = new Map<string, WebSocket>();

export function setupWSHandlers(wss: WebSocketServer): void {
  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    let authenticated = false;
    let userId: string | null = null;

    const send = (type: string, payload: Record<string, unknown>): void => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload }));
      }
    };

    socket.on('message', async (data: WebSocket.RawData) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        if (message.type === 'auth') {
          const authData = message.payload as unknown as AuthPayload;
          if (authenticateClient(socket, request, { type: 'auth', payload: authData })) {
            authenticated = true;
            userId = authData.userId;
            connectedClients.set(userId, socket);
            send('auth:success', { userId });
          }
          return;
        }

        if (!authenticated || !userId) {
          send('error', { message: 'Not authenticated' });
          return;
        }

        switch (message.type) {
          case 'poll:start': {
            const payload = message.payload as unknown as PollStartPayload;
            if (!isWhitelisted(payload.userId)) {
              send('error', { message: 'Unauthorized' });
              return;
            }
            const poll = await prisma.poll.findUnique({
              where: { id: payload.pollId },
              include: { options: true },
            });
            if (poll) {
              serverEvents.emit('poll:start', poll);
              send('poll:started', { pollId: poll.id });
            }
            break;
          }

          case 'poll:end': {
            const payload = message.payload as unknown as PollEndPayload;
            if (!isWhitelisted(payload.userId)) {
              send('error', { message: 'Unauthorized' });
              return;
            }
            serverEvents.emit('poll:end', { pollId: payload.pollId });
            send('poll:ended', { pollId: payload.pollId });
            break;
          }

          default:
            send('error', { message: `Unknown message type: ${message.type}` });
        }
      } catch {
        send('error', { message: 'Invalid message format' });
      }
    });

    socket.on('close', () => {
      if (userId) {
        connectedClients.delete(userId);
      }
    });
  });
}