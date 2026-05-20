import { describe, test, expect } from 'bun:test';

/**
 * End-to-end integration tests for the live poll lifecycle.
 * Requires the Docker stack to be running.
 *
 * Run: bun test tests/live-poll.integration.test.ts
 */

const API = 'http://localhost:3000';
const USER_ID = '319612211024887828';
const TEST_CHANNEL = 'test-channel-' + Date.now();

interface Poll {
  id: string;
  question: string;
  channelId: string;
  status: string;
  runs?: PollRun[];
}

interface PollRun {
  id: string;
  status: string;
  votes?: Vote[];
}

interface Vote {
  option: number;
  userId: string;
}

async function api(method: string, path: string, body?: unknown): Promise<Response> {
  const opts: RequestInit = {
    method,
    headers: { 'x-user-id': USER_ID, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${API}${path}`, opts);
}

describe('Live poll lifecycle', () => {
  let pollId: string;
  let runId: string;

  test('1. Create poll', async () => {
    const r = await api('POST', '/api/polls', {
      question: 'Integration test poll',
      channelId: TEST_CHANNEL,
      guildId: 'test-guild',
      options: [
        { number: 1, label: 'Option A' },
        { number: 2, label: 'Option B' },
      ],
    });
    expect(r.status).toBe(201);
    const poll: Poll = await r.json();
    pollId = poll.id;
    expect(poll.status).toBe('DRAFT');
    expect(poll.channelId).toBe(TEST_CHANNEL);
  });

  test('2. Start poll', async () => {
    const r = await api('POST', `/api/polls/${pollId}/start`);
    expect(r.ok).toBe(true);
    const run: PollRun = await r.json();
    runId = run.id;
    expect(run.status).toBe('LIVE');
  });

  test('3. Poll is LIVE', async () => {
    const r = await api('GET', `/api/polls/${pollId}`);
    const poll: Poll = await r.json();
    expect(poll.status).toBe('LIVE');
    expect(poll.runs).toHaveLength(1);
    expect(poll.runs![0].status).toBe('LIVE');
  });

  test('4. Cannot start twice', async () => {
    const r = await api('POST', `/api/polls/${pollId}/start`);
    expect(r.status).toBe(400);
    const err = await r.json();
    expect(err.error).toMatch(/already has a live run/i);
  });

  test('5. Insert vote and verify via API', async () => {
    const sql = `INSERT INTO "Vote" ("id", "pollId", "runId", "option", "userId")
VALUES (gen_random_uuid()::text, '${pollId}', '${runId}', 1, 'voter-int-001');`;

    const proc = Bun.spawnSync([
      'docker', 'exec', '-i', 'polly-postgres-1',
      'psql', '-U', 'postgres', '-d', 'polly',
    ], { stdin: new TextEncoder().encode(sql), stdout: 'pipe', stderr: 'pipe' });
    expect(proc.exitCode).toBe(0);

    // Verify vote appears via API
    const r = await api('GET', `/api/polls/${pollId}`);
    const poll: Poll = await r.json();
    const votes = poll.runs?.[0]?.votes ?? [];
    expect(votes).toHaveLength(1);
    expect(votes[0].option).toBe(1);
    expect(votes[0].userId).toBe('voter-int-001');
  });

  test('6. Multiple votes from same user are counted separately', async () => {
    // Insert 3 more votes: same user, same option, and a different option
    const sql = `INSERT INTO "Vote" ("id", "pollId", "runId", "option", "userId")
VALUES
  (gen_random_uuid()::text, '${pollId}', '${runId}', 1, 'voter-int-001'),
  (gen_random_uuid()::text, '${pollId}', '${runId}', 1, 'voter-int-001'),
  (gen_random_uuid()::text, '${pollId}', '${runId}', 2, 'voter-int-002');`;

    const proc = Bun.spawnSync([
      'docker', 'exec', '-i', 'polly-postgres-1',
      'psql', '-U', 'postgres', '-d', 'polly',
    ], { stdin: new TextEncoder().encode(sql), stdout: 'pipe', stderr: 'pipe' });
    expect(proc.exitCode).toBe(0);

    const r = await api('GET', `/api/polls/${pollId}`);
    const poll: Poll = await r.json();
    const votes = poll.runs?.[0]?.votes ?? [];

    // Total: 1 (from test 5) + 3 (from this insert) = 4 votes
    expect(votes).toHaveLength(4);

    // Count by option (same logic as LivePoll.tsx)
    const countMap = new Map<number, number>();
    votes.forEach((v: { option: number }) => countMap.set(v.option, (countMap.get(v.option) || 0) + 1));
    expect(countMap.get(1)).toBe(3); // voter-int-001 voted option 1 three times
    expect(countMap.get(2)).toBe(1); // voter-int-002 voted option 2 once
  });

  test('7. End poll', async () => {
    const r = await api('POST', `/api/polls/${pollId}/end`);
    expect(r.ok).toBe(true);
    const run: PollRun = await r.json();
    expect(run.status).toBe('ENDED');
  });

  test('8. Cannot end twice', async () => {
    const r = await api('POST', `/api/polls/${pollId}/end`);
    expect(r.status).toBe(400);
    const err = await r.json();
    expect(err.error).toMatch(/no live run/i);
  });

  test('9. Cannot delete live run', async () => {
    // Restart to test delete-while-live guard
    const r1 = await api('POST', `/api/polls/${pollId}/start`);
    expect(r1.ok).toBe(true);
    const run2: PollRun = await r1.json();
    const r2 = await api('DELETE', `/api/polls/${pollId}/runs/${run2.id}`);
    expect(r2.status).toBe(400);
    const err = await r2.json();
    expect(err.error).toMatch(/end poll first/i);
    // End it again so cleanup works
    await api('POST', `/api/polls/${pollId}/end`);
  });

  test('10. Cleanup — delete poll', async () => {
    const r = await api('DELETE', `/api/polls/${pollId}`);
    expect(r.status).toBe(204);
  });
});
