import { describe, test, expect, jest } from 'bun:test';
import { EventEmitter } from 'events';
import { messageCreateHandler } from '../src/bot/handlers/messageCreate';

function createMockMessage(overrides: Partial<{
  content: string;
  authorId: string;
  authorBot: boolean;
  channelId: string;
}> = {}) {
  return {
    content: overrides.content ?? '',
    channelId: overrides.channelId ?? 'channel-123',
    author: {
      id: overrides.authorId ?? 'user-456',
      bot: overrides.authorBot ?? false,
    },
  } as any; // Partial mock of discord.js Message
}

describe('messageCreateHandler', () => {
  describe('ignores bot messages', () => {
    test('does not emit vote for bot messages', () => {
      const events = new EventEmitter();
      const spy = jest.fn();
      events.on('vote', spy);

      messageCreateHandler(
        createMockMessage({ content: '1', authorBot: true }),
        events,
      );

      expect(spy).not.toHaveBeenCalled();
    });

    test('emits vote for non-bot messages', () => {
      const events = new EventEmitter();
      const spy = jest.fn();
      events.on('vote', spy);

      messageCreateHandler(
        createMockMessage({ content: '1', authorBot: false }),
        events,
      );

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('valid single-digit votes (1-9)', () => {
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      test(`"${digit}" emits vote with option ${digit}`, () => {
        const events = new EventEmitter();
        const spy = jest.fn();
        events.on('vote', spy);

        messageCreateHandler(
          createMockMessage({
            content: digit,
            authorId: 'user-123',
            channelId: 'channel-456',
          }),
          events,
        );

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({
          pollId: 'channel-456',
          option: parseInt(digit, 10),
          userId: 'user-123',
        });
      });
    }
  });

  describe('invalid messages do not emit', () => {
    const invalidInputs = [
      { desc: 'empty string', content: '' },
      { desc: 'zero', content: '0' },
      { desc: 'double digit', content: '10' },
      { desc: 'triple digit', content: '111' },
      { desc: 'letter', content: 'a' },
      { desc: 'digit with letter', content: '1a' },
      { desc: 'letter with digit', content: 'a1' },
      { desc: 'whitespace', content: ' ' },
      { desc: 'multi-char whitespace', content: '  ' },
      { desc: 'special character', content: '!' },
    ];

    for (const { desc, content } of invalidInputs) {
      test(`"${desc}" does not emit vote`, () => {
        const events = new EventEmitter();
        const spy = jest.fn();
        events.on('vote', spy);

        messageCreateHandler(
          createMockMessage({ content }),
          events,
        );

        expect(spy).not.toHaveBeenCalled();
      });
    }
  });

  describe('emits correct payload shape', () => {
    test('pollId maps from channelId', () => {
      const events = new EventEmitter();
      const spy = jest.fn();
      events.on('vote', spy);

      messageCreateHandler(
        createMockMessage({ content: '3', channelId: 'my-channel', authorId: 'u1' }),
        events,
      );

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ pollId: 'my-channel' }),
      );
    });

    test('userId maps from author.id', () => {
      const events = new EventEmitter();
      const spy = jest.fn();
      events.on('vote', spy);

      messageCreateHandler(
        createMockMessage({ content: '5', authorId: 'user-999', channelId: 'ch' }),
        events,
      );

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-999' }),
      );
    });
  });
});
