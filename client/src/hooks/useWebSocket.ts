import { useState, useEffect, useCallback, useRef } from 'react';
import type { Vote } from '@/types';

interface PollStatus {
  pollId: string;
  status: 'DRAFT' | 'LIVE' | 'ENDED';
}

interface WebSocketMessage {
  type: string;
  payload?: unknown;
}

export function useWebSocket(pollId?: string) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [pollStatus, setPollStatus] = useState<PollStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      const userId = localStorage.getItem('polly-user-id');
      if (userId) {
        sendMessage({ type: 'auth', payload: { userId } });
      }
      if (pollId) {
        sendMessage({ type: 'subscribe', payload: { pollId } });
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'poll:update' && message.payload) {
          const payload = message.payload as { votes?: Vote[]; poll?: PollStatus };
          if (payload.votes) {
            setVotes(payload.votes);
          }
          if (payload.poll) {
            setPollStatus(payload.poll);
          }
        }
        if (message.type === 'poll:status' && message.payload) {
          setPollStatus(message.payload as PollStatus);
        }
        if (message.type === 'vote:new' && message.payload) {
          const newVote = message.payload as Vote;
          setVotes((prev) => [...prev, newVote]);
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [pollId, sendMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (pollId && isConnected) {
      sendMessage({ type: 'subscribe', payload: { pollId } });
    }
  }, [pollId, isConnected, sendMessage]);

  return { votes, pollStatus, isConnected, sendMessage };
}