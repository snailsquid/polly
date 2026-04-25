import { describe, test, expect } from 'bun:test';
import { z } from 'zod';

const OptionInputSchema = z.object({
  number: z.number().int().min(1).max(9),
  label: z.string().min(1),
  image: z.string().optional(),
});

const CreatePollSchema = z.object({
  question: z.string().min(1),
  channelId: z.string().min(1),
  guildId: z.string().min(1),
  liveTheme: z.string().default('bar'),
  resultTheme: z.string().default('bar'),
  options: z.array(OptionInputSchema).min(1).max(9),
});

const UpdatePollSchema = z.object({
  question: z.string().min(1).optional(),
  liveTheme: z.string().optional(),
  resultTheme: z.string().optional(),
  status: z.enum(['DRAFT', 'LIVE', 'ENDED']).optional(),
  options: z.array(OptionInputSchema).optional(),
});

describe('OptionInputSchema', () => {
  describe('Valid inputs', () => {
    test('valid option with number and label', () => {
      const result = OptionInputSchema.safeParse({
        number: 1,
        label: 'Option 1',
      });
      expect(result.success).toBe(true);
    });

    test('valid option with number, label, and image', () => {
      const result = OptionInputSchema.safeParse({
        number: 5,
        label: 'Choice 5',
        image: 'https://example.com/image.png',
      });
      expect(result.success).toBe(true);
    });

    test('number at boundaries (1 and 9)', () => {
      expect(OptionInputSchema.safeParse({ number: 1, label: 'A' }).success).toBe(true);
      expect(OptionInputSchema.safeParse({ number: 9, label: 'B' }).success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    test('number 0 is invalid', () => {
      const result = OptionInputSchema.safeParse({ number: 0, label: 'Test' });
      expect(result.success).toBe(false);
    });

    test('number 10 is invalid', () => {
      const result = OptionInputSchema.safeParse({ number: 10, label: 'Test' });
      expect(result.success).toBe(false);
    });

    test('empty label is invalid', () => {
      const result = OptionInputSchema.safeParse({ number: 1, label: '' });
      expect(result.success).toBe(false);
    });

    test('missing label is invalid', () => {
      const result = OptionInputSchema.safeParse({ number: 1 });
      expect(result.success).toBe(false);
    });

    test('negative number is invalid', () => {
      const result = OptionInputSchema.safeParse({ number: -1, label: 'Test' });
      expect(result.success).toBe(false);
    });
  });
});

describe('CreatePollSchema', () => {
  describe('Valid inputs', () => {
    test('valid poll with minimal fields', () => {
      const result = CreatePollSchema.safeParse({
        question: 'What is your favorite color?',
        channelId: '123456',
        guildId: '789012',
        options: [{ number: 1, label: 'Red' }],
      });
      expect(result.success).toBe(true);
    });

    test('valid poll with all fields', () => {
      const result = CreatePollSchema.safeParse({
        question: 'Which framework?',
        channelId: '123456',
        guildId: '789012',
        liveTheme: 'pie',
        resultTheme: 'donut',
        options: [
          { number: 1, label: 'React' },
          { number: 2, label: 'Vue' },
        ],
      });
      expect(result.success).toBe(true);
    });

    test('defaults are applied', () => {
      const result = CreatePollSchema.safeParse({
        question: 'Test question',
        channelId: '123',
        guildId: '456',
        options: [{ number: 1, label: 'A' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.liveTheme).toBe('bar');
        expect(result.data.resultTheme).toBe('bar');
      }
    });
  });

  describe('Invalid inputs', () => {
    test('empty question is invalid', () => {
      const result = CreatePollSchema.safeParse({
        question: '',
        channelId: '123',
        guildId: '456',
        options: [{ number: 1, label: 'A' }],
      });
      expect(result.success).toBe(false);
    });

    test('empty channelId is invalid', () => {
      const result = CreatePollSchema.safeParse({
        question: 'Test?',
        channelId: '',
        guildId: '456',
        options: [{ number: 1, label: 'A' }],
      });
      expect(result.success).toBe(false);
    });

    test('empty options array is invalid', () => {
      const result = CreatePollSchema.safeParse({
        question: 'Test?',
        channelId: '123',
        guildId: '456',
        options: [],
      });
      expect(result.success).toBe(false);
    });

    test('more than 9 options is invalid', () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        number: i + 1,
        label: `Option ${i + 1}`,
      }));
      const result = CreatePollSchema.safeParse({
        question: 'Too many options?',
        channelId: '123',
        guildId: '456',
        options,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('UpdatePollSchema', () => {
  describe('Valid inputs', () => {
    test('updating question only', () => {
      const result = UpdatePollSchema.safeParse({ question: 'New question?' });
      expect(result.success).toBe(true);
    });

    test('updating status only', () => {
      const result = UpdatePollSchema.safeParse({ status: 'LIVE' });
      expect(result.success).toBe(true);
    });

    test('updating multiple fields', () => {
      const result = UpdatePollSchema.safeParse({
        question: 'Updated?',
        liveTheme: 'pie',
        status: 'ENDED',
      });
      expect(result.success).toBe(true);
    });

    test('all status enum values', () => {
      expect(UpdatePollSchema.safeParse({ status: 'DRAFT' }).success).toBe(true);
      expect(UpdatePollSchema.safeParse({ status: 'LIVE' }).success).toBe(true);
      expect(UpdatePollSchema.safeParse({ status: 'ENDED' }).success).toBe(true);
    });

    test('empty object is valid (all optional)', () => {
      const result = UpdatePollSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    test('invalid status value', () => {
      const result = UpdatePollSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    test('empty question string is invalid', () => {
      const result = UpdatePollSchema.safeParse({ question: '' });
      expect(result.success).toBe(false);
    });
  });
});