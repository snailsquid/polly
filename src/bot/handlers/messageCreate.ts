import type { Message } from "discord.js";
import type { EventEmitter } from "events";

interface VoteEvent {
	pollId: string;
	text: string;
	userId: string;
}

export function messageCreateHandler(
	message: Message,
	events: EventEmitter,
): void {
	if (message.author.bot) return;

	// The bot is stateless about poll configuration (no DB access here), so it
	// forwards the raw message token and lets the server resolve it against the
	// live poll's voteType and options (numeric digit or text label match).
	const text = message.content.trim();
	if (!text) return;

	events.emit("vote", {
		pollId: message.channelId,
		text,
		userId: message.author.id,
	} as VoteEvent);
}
