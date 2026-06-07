import { useState, useEffect, useRef } from 'react';
import type { Vote } from '@/types';
import type { Poll } from '@/types';

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
  const pollIdRef = useRef(pollId);
  const sendMessageRef = useRef<((message: WebSocketMessage) => void) | null>(null);

  pollIdRef.current = pollId;

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };
  sendMessageRef.current = sendMessage;

  const connect = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      const userId = localStorage.getItem('polly-user-id');
      if (userId) {
        sendMessage({ type: 'auth', payload: { userId } });
      }
      if (pollIdRef.current) {
        sendMessage({ type: 'subscribe', payload: { pollId: pollIdRef.current } });
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'poll:update' && message.payload) {
          // Server sends the full Poll object: { id, ..., options, runs: [{ votes }] }
          const payload = message.payload as Poll;
          if (payload.runs && payload.runs.length > 0) {
            const liveRun = payload.runs.find((r) => r.status === 'LIVE');
            const votes = liveRun?.votes ?? [];
            setVotes(votes);
          }
          setPollStatus({ pollId: payload.id, status: payload.status });
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (pollId && isConnected) {
      sendMessage({ type: 'subscribe', payload: { pollId } });
    }
  }, [pollId, isConnected]);

  return { votes, pollStatus, isConnected, sendMessage };
}
