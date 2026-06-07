import { Message } from 'discord.js';
import { EventEmitter } from 'events';

const VOTE_REGEX = /^([1-9])$/;

interface VoteEvent {
  pollId: string;
  option: number;
  userId: string;
}

export function messageCreateHandler(
  message: Message,
  events: EventEmitter
): void {
  if (message.author.bot) return;

  const match = message.content.match(VOTE_REGEX);
  if (!match) return;

  const voteNumber = parseInt(match[1], 10);
  const userId = message.author.id;

  events.emit('vote', {
    pollId: message.channelId,
    option: voteNumber,
    userId,
  } as VoteEvent);
}