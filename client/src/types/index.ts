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
	status: "DRAFT" | "LIVE" | "ENDED";
	duration?: number | null;
	scheduledEnd?: string | null;
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
	status: "DRAFT" | "LIVE" | "ENDED";
	voteType: "NUMBER" | "TEXT";
	liveTheme: string;
	ownerId: string;
	shareCode?: string | null;
	options: Option[];
	runs: PollRun[];
}

export interface PollTemplate {
	question: string;
	channelId: string;
	guildId: string;
	voteType: "NUMBER" | "TEXT";
	liveTheme: string;
	options: Array<{ number: number; label: string; image?: string }>;
}

export interface ApiError {
	error: string;
	details?: unknown;
}
