import { describe, test, expect, afterEach } from 'bun:test';

const originalEnv = process.env;

function parseWhitelist(env: typeof process.env): string[] {
  return (env.WHITELIST_USER_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

function isWhitelisted(userId: string, whitelist: string[]): boolean {
  return whitelist.includes(userId);
}

describe('Whitelist authentication', () => {
  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isWhitelisted', () => {
    test('single whitelisted ID returns true', () => {
      const whitelist = parseWhitelist({ ...originalEnv, WHITELIST_USER_IDS: 'user123' });
      expect(isWhitelisted('user123', whitelist)).toBe(true);
    });

    test('single non-whitelisted ID returns false', () => {
      const whitelist = parseWhitelist({ ...originalEnv, WHITELIST_USER_IDS: 'user123' });
      expect(isWhitelisted('user456', whitelist)).toBe(false);
    });

    test('multiple whitelisted IDs', () => {
      const whitelist = parseWhitelist({ ...originalEnv, WHITELIST_USER_IDS: 'user1,user2,user3' });
      expect(isWhitelisted('user1', whitelist)).toBe(true);
      expect(isWhitelisted('user2', whitelist)).toBe(true);
      expect(isWhitelisted('user3', whitelist)).toBe(true);
      expect(isWhitelisted('user4', whitelist)).toBe(false);
    });

    test('spaces in comma-separated list are trimmed', () => {
      const whitelist = parseWhitelist({ ...originalEnv, WHITELIST_USER_IDS: ' user1 , user2 , user3 ' });
      expect(isWhitelisted('user1', whitelist)).toBe(true);
      expect(isWhitelisted('user2', whitelist)).toBe(true);
      expect(isWhitelisted('user3', whitelist)).toBe(true);
    });
  });
});