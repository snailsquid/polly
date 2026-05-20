export interface Option {
  id: string;
  number: number;
  label: string;
  image?: string;
}

export interface Vote {
  id: string;
  pollId: string;
  runId: string;
  option: number;
  userId: string;
  createdAt: string;
}

export interface PollRun {
  id: string;
  pollId: string;
  runNumber: number;
  status: 'DRAFT' | 'LIVE' | 'ENDED';
  createdAt: string;
  updatedAt: string;
  votes?: Vote[];
  _count?: {
    votes: number;
  };
}

export interface Poll {
  id: string;
  question: string;
  channelId: string;
  guildId: string;
  status: 'DRAFT' | 'LIVE' | 'ENDED';
  liveTheme: string;
  resultTheme: string;
  ownerId: string;
  options: Option[];
  runs: PollRun[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}