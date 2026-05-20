import { prisma } from '../../db/client';
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

const WHITELIST_USER_IDS = (process.env.WHITELIST_USER_IDS ?? '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id.length > 0);

function isWhitelisted(userId: string): boolean {
  return WHITELIST_USER_IDS.includes(userId);
}

export const connectedClients = new Map<string, WebSocket>();

// Broadcast to all connected clients
export function wssBroadcast(message: Record<string, unknown>): void {
  const data = JSON.stringify(message);
  for (const [userId, ws] of connectedClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Send to a specific client
export function wssSend(ws: WebSocket, type: string, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

// Bun WebSocket handler configuration
export function setupWSHandler() {
  const clients = connectedClients;

  return {
    open(ws: WebSocket) {
      // Store pending auth state
      (ws as any)._authenticated = false;
      (ws as any)._userId = null;
    },

    message(ws: WebSocket, data: string | Buffer) {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        if (message.type === 'auth') {
          const authData = message.payload as unknown as AuthPayload;
          const userId = authData.userId;

          if (!userId || !isWhitelisted(userId)) {
            wssSend(ws, 'error', { message: 'Unauthorized' });
            return;
          }

          (ws as any)._authenticated = true;
          (ws as any)._userId = userId;
          clients.set(userId, ws);
          wssSend(ws, 'auth:success', { userId });
          return;
        }

        if (!(ws as any)._authenticated) {
          wssSend(ws, 'error', { message: 'Not authenticated' });
          return;
        }

        const userId = (ws as any)._userId;

        switch (message.type) {
          case 'poll:start': {
            const payload = message.payload as unknown as PollStartPayload;
            if (!isWhitelisted(payload.userId)) {
              wssSend(ws, 'error', { message: 'Unauthorized' });
              return;
            }
            serverEvents.emit('poll:start', { pollId: payload.pollId });
            wssSend(ws, 'poll:started', { pollId: payload.pollId });
            break;
          }

          case 'poll:end': {
            const payload = message.payload as unknown as PollEndPayload;
            if (!isWhitelisted(payload.userId)) {
              wssSend(ws, 'error', { message: 'Unauthorized' });
              return;
            }
            serverEvents.emit('poll:end', { pollId: payload.pollId });
            wssSend(ws, 'poll:ended', { pollId: payload.pollId });
            break;
          }

          case 'subscribe':
            // Client subscribes to poll updates — server broadcasts to all clients,
            // so this is a silent no-op until subscription-based filtering is implemented.
            break;

          default:
            wssSend(ws, 'error', { message: `Unknown message type: ${message.type}` });
        }
      } catch {
        wssSend(ws, 'error', { message: 'Invalid message format' });
      }
    },

    close(ws: WebSocket) {
      const userId = (ws as any)._userId;
      if (userId) {
        clients.delete(userId);
      }
    },
  };
}
