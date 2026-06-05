import type { Poll, PollRun, ApiError } from '@/types';

export interface ChannelCheckResult {
  accessible: boolean;
  error?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getUserId(): string {
  return localStorage.getItem('polly-user-id') || '';
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function getPolls(): Promise<Poll[]> {
  const response = await fetch(`${BASE_URL}/api/polls`, {
    headers: {
      'x-user-id': getUserId(),
    },
  });
  return handleResponse<Poll[]>(response);
}

export async function createPoll(data: Partial<Poll>): Promise<Poll> {
  const response = await fetch(`${BASE_URL}/api/polls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Poll>(response);
}

export async function getPoll(id: string): Promise<Poll> {
  const response = await fetch(`${BASE_URL}/api/polls/${id}`, {
    headers: {
      'x-user-id': getUserId(),
    },
  });
  return handleResponse<Poll>(response);
}

export async function updatePoll(id: string, data: Partial<Poll>): Promise<Poll> {
  const response = await fetch(`${BASE_URL}/api/polls/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Poll>(response);
}

export async function deletePoll(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/polls/${id}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': getUserId(),
    },
  });
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw error;
  }
}

export async function startPoll(id: string, duration?: number): Promise<PollRun> {
  const response = await fetch(`${BASE_URL}/api/polls/${id}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
    body: duration ? JSON.stringify({ duration }) : undefined,
  });
  return handleResponse<PollRun>(response);
}

export async function endPoll(id: string): Promise<Poll> {
  const response = await fetch(`${BASE_URL}/api/polls/${id}/end`, {
    method: 'POST',
    headers: {
      'x-user-id': getUserId(),
    },
  });
  return handleResponse<Poll>(response);
}

export async function importPoll(pollId: string): Promise<Poll> {
  const response = await fetch(`${BASE_URL}/api/polls/${pollId}/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
  });
  return handleResponse<Poll>(response);
}

export async function getRuns(pollId: string): Promise<PollRun[]> {
  const response = await fetch(`${BASE_URL}/api/polls/${pollId}/runs`, {
    headers: {
      'x-user-id': getUserId(),
    },
  });
  return handleResponse<PollRun[]>(response);
}

export async function deleteRun(pollId: string, runId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/polls/${pollId}/runs/${runId}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': getUserId(),
    },
  });
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw error;
  }
}

export async function checkChannel(guildId: string, channelId: string): Promise<ChannelCheckResult> {
  const response = await fetch(`${BASE_URL}/api/check-channel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
    body: JSON.stringify({ guildId, channelId }),
  });
  return handleResponse<ChannelCheckResult>(response);
}