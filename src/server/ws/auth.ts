// Bun provides WebSocket as a global
import { IncomingMessage } from 'http';
import { env } from '../../env';

interface AuthMessage {
  type: 'auth';
  payload: {
    userId: string;
  };
}

export function authenticateClient(
  socket: WebSocket,
  _request: IncomingMessage,
  data: AuthMessage
): boolean {
  const userId = data.payload.userId;

  if (!env.WHITELIST_USER_IDS.includes(userId)) {
    socket.send(
      JSON.stringify({
        type: 'error',
        payload: { message: 'Unauthorized' },
      })
    );
    socket.close(1008, 'Unauthorized');
    return false;
  }

  return true;
}

export function isWhitelisted(userId: string): boolean {
  return env.WHITELIST_USER_IDS.includes(userId);
}