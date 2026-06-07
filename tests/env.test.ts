import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

const originalEnv = process.env;

describe('Environment parsing', () => {
  afterEach(() => {
    process.env = originalEnv;
  });

  describe('WHITELIST_USER_IDS parsing', () => {
    test('splits by comma', () => {
      process.env = { ...originalEnv, WHITELIST_USER_IDS: 'user1,user2,user3' };
      const ids = process.env.WHITELIST_USER_IDS?.split(',') ?? [];
      expect(ids).toEqual(['user1', 'user2', 'user3']);
    });

    test('trims spaces', () => {
      process.env = { ...originalEnv, WHITELIST_USER_IDS: ' user1 , user2 , user3 ' };
      const ids = process.env.WHITELIST_USER_IDS?.split(',').map(id => id.trim()) ?? [];
      expect(ids).toEqual(['user1', 'user2', 'user3']);
    });

    test('filters empty strings', () => {
      process.env = { ...originalEnv, WHITELIST_USER_IDS: 'user1,,user2,,,user3' };
      const ids = (process.env.WHITELIST_USER_IDS ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      expect(ids).toEqual(['user1', 'user2', 'user3']);
    });

    test('single ID without comma', () => {
      process.env = { ...originalEnv, WHITELIST_USER_IDS: 'user1' };
      const ids = (process.env.WHITELIST_USER_IDS ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      expect(ids).toEqual(['user1']);
    });

    test('empty string results in empty array', () => {
      process.env = { ...originalEnv, WHITELIST_USER_IDS: '' };
      const ids = (process.env.WHITELIST_USER_IDS ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      expect(ids).toEqual([]);
    });
  });

  describe('PORT defaults', () => {
    test('uses default when PORT not set', () => {
      const env = { ...originalEnv };
      delete env.PORT;
      process.env = env;
      const port = parseInt(process.env.PORT ?? '3000', 10);
      expect(port).toBe(3000);
    });

    test('parses set PORT', () => {
      process.env = { ...originalEnv, PORT: '8080' };
      const port = parseInt(process.env.PORT ?? '3000', 10);
      expect(port).toBe(8080);
    });
  });

  describe('WS_PORT defaults', () => {
    test('uses default when WS_PORT not set', () => {
      const env = { ...originalEnv };
      delete env.WS_PORT;
      process.env = env;
      const wsPort = parseInt(process.env.WS_PORT ?? '8080', 10);
      expect(wsPort).toBe(8080);
    });

    test('parses set WS_PORT', () => {
      process.env = { ...originalEnv, WS_PORT: '9000' };
      const wsPort = parseInt(process.env.WS_PORT ?? '8080', 10);
      expect(wsPort).toBe(9000);
    });
  });

  describe('required env variables', () => {
    test('DISCORD_BOT_TOKEN returns empty string when not set', () => {
      const env = { ...originalEnv };
      delete env.DISCORD_BOT_TOKEN;
      process.env = env;
      expect(process.env.DISCORD_BOT_TOKEN ?? '').toBe('');
    });

    test('DATABASE_URL returns empty string when not set', () => {
      const env = { ...originalEnv };
      delete env.DATABASE_URL;
      process.env = env;
      expect(process.env.DATABASE_URL ?? '').toBe('');
    });
  });
});