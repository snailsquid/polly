import { describe, test, expect, jest } from "bun:test";
import { EventEmitter } from "events";
import { messageCreateHandler } from "../src/bot/handlers/messageCreate";

function createMockMessage(
	overrides: Partial<{
		content: string;
		authorId: string;
		authorBot: boolean;
		channelId: string;
	}> = {},
) {
	return {
		content: overrides.content ?? "",
		channelId: overrides.channelId ?? "channel-123",
		author: {
			id: overrides.authorId ?? "user-456",
			bot: overrides.authorBot ?? false,
		},
	} as any; // Partial mock of discord.js Message
}

describe("messageCreateHandler", () => {
	describe("ignores bot messages", () => {
		test("does not emit vote for bot messages", () => {
			const events = new EventEmitter();
			const spy = jest.fn();
			events.on("vote", spy);

			messageCreateHandler(
				createMockMessage({ content: "1", authorBot: true }),
				events,
			);

			expect(spy).not.toHaveBeenCalled();
		});

		test("emits vote for non-bot messages", () => {
			const events = new EventEmitter();
			const spy = jest.fn();
			events.on("vote", spy);

			messageCreateHandler(
				createMockMessage({ content: "1", authorBot: false }),
				events,
			);

			expect(spy).toHaveBeenCalledTimes(1);
		});
	});

	describe("forwards raw token (resolution happens server-side)", () => {
		test("emits trimmed text for a numeric message", () => {
			const events = new EventEmitter();
			const spy = jest.fn();
			events.on("vote", spy);

			messageCreateHandler(
				createMockMessage({
					content: "3",
					authorId: "user-123",
					channelId: "channel-456",
				}),
				events,
			);

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith({
				pollId: "channel-456",
				text: "3",
				userId: "user-123",
			});
		});

		test("emits trimmed text for a word message", () => {
			const events = new EventEmitter();
			const spy = jest.fn();
			events.on("vote", spy);

			messageCreateHandler(
				createMockMessage({
					content: "  Apple  ",
					authorId: "u1",
					channelId: "ch",
				}),
				events,
			);

			expect(spy).toHaveBeenCalledWith({
				pollId: "ch",
				text: "Apple",
				userId: "u1",
			});
		});
	});

	describe("blank messages do not emit", () => {
		for (const { desc, content } of [
			{ desc: "empty string", content: "" },
			{ desc: "whitespace", content: " " },
			{ desc: "multi-char whitespace", content: "   " },
		]) {
			test(`"${desc}" does not emit vote`, () => {
				const events = new EventEmitter();
				const spy = jest.fn();
				events.on("vote", spy);

				messageCreateHandler(createMockMessage({ content }), events);

				expect(spy).not.toHaveBeenCalled();
			});
		}
	});

	describe("emits correct payload shape", () => {
		test("pollId maps from channelId", () => {
			const events = new EventEmitter();
			const spy = jest.fn();
			events.on("vote", spy);

			messageCreateHandler(
				createMockMessage({
					content: "3",
					channelId: "my-channel",
					authorId: "u1",
				}),
				events,
			);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({ pollId: "my-channel" }),
			);
		});

		test("userId maps from author.id", () => {
			const events = new EventEmitter();
			const spy = jest.fn();
			events.on("vote", spy);

			messageCreateHandler(
				createMockMessage({
					content: "5",
					authorId: "user-999",
					channelId: "ch",
				}),
				events,
			);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({ userId: "user-999" }),
			);
		});
	});
});
