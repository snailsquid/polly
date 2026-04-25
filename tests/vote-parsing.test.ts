import { describe, test, expect } from 'bun:test';

const VOTE_REGEX = /^([1-9])$/;

describe('Vote parsing regex', () => {
  describe('Valid votes', () => {
    const validVotes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    for (const vote of validVotes) {
      test(`"${vote}" should match and extract ${vote}`, () => {
        const match = vote.match(VOTE_REGEX);
        expect(match).not.toBeNull();
        expect(parseInt(match![1], 10)).toBe(parseInt(vote, 10));
      });
    }
  });

  describe('Invalid votes', () => {
    const invalidVotes = ['', '0', '10', '11', '111', '123', '1a', 'a1', 'a', ' '];

    for (const vote of invalidVotes) {
      test(`"${vote}" should NOT match`, () => {
        const match = vote.match(VOTE_REGEX);
        expect(match).toBeNull();
      });
    }
  });

  test('regex should only match single digit 1-9', () => {
    expect(VOTE_REGEX.test('1')).toBe(true);
    expect(VOTE_REGEX.test('9')).toBe(true);
    expect(VOTE_REGEX.test('0')).toBe(false);
    expect(VOTE_REGEX.test('10')).toBe(false);
  });
});