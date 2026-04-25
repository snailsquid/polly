export interface Option {
  id: string;
  number: number;
  label: string;
  image?: string;
}

export interface Vote {
  id: string;
  pollId: string;
  option: number;
  userId: string;
  createdAt: string;
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
  votes: Vote[];
}

export interface ApiError {
  error: string;
  details?: unknown;
}