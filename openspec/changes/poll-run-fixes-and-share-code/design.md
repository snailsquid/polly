## Context

The `Poll` → `PollRun[]` data model already supports multi-run polls correctly on the backend. Two client-side bugs prevent it from working in practice: the WebSocket handler reads `runs[0]` (oldest) instead of the LIVE run, and the Results page flatMaps all ended runs together. Additionally, the poll-sharing flow is nearly complete — the backend clone endpoint and Home import dialog exist — but owners have no way to surface a shareable identifier from the UI. This design covers fixing the run identity issues and adding a short share code.

## Goals / Non-Goals

**Goals:**
- Fix WS run selection so vote updates apply to the correct run after a restart
- Fix Results page to show per-run votes with a run picker
- Wire "Start Another Run" to actually start a run (not just navigate)
- Navigate to Results (not Edit) after ending a live poll
- Add lazy-generated short share code to Poll; expose it via Copy button on PollDetail
- Add `GET /by-code/:code` endpoint returning template config only
- Replace Home "Import by ID" dialog with "Paste from code" dialog using short codes

**Non-Goals:**
- Embedded/self-contained codes (config travels on server, not in the code string)
- Cross-deployment sharing (single server only)
- Run history in share payload
- Merging runs in any UI (no "all runs combined" view)

## Decisions

### 1. WS run selection: find LIVE run by status, not index

`useWebSocket.ts` currently does `payload.runs[0].votes`. Fix: `payload.runs.find(r => r.status === 'LIVE')?.votes ?? []`. The server already returns all runs in the `poll:update` payload — no server changes needed.

*Alternative considered:* have the server send a `runId` in the event and have the client look it up. Rejected — over-engineered; the status field is the authoritative signal.

### 2. Results run picker: client-side only, default to max runNumber

The full poll (including all runs + votes) is already fetched by `getPoll`. Run selection is pure client state — a `useState<string>` holding the selected `runId`, defaulting to `runs.filter(ENDED).sort desc by runNumber[0].id`. No new API calls.

*Alternative considered:* per-run endpoint `GET /polls/:id/runs/:runId/votes`. Rejected — unnecessary round-trip; votes are already in the poll payload.

### 3. Share code: 6-char nanoid (alphanumeric), lazy, collision-checked

Generate on first `POST /polls/:id/share-code` call. Use nanoid with a custom alphabet (`0-9a-z`, no ambiguous chars like `0/o`, `1/l`). Check uniqueness before saving; retry up to 5 times on collision (collision probability at <1000 polls is negligible).

Schema: `shareCode String? @unique` on `Poll`. Nullable so no migration backfill needed for existing polls.

*Alternative considered:* use poll's cuid directly (no schema change). Rejected — cuids are 25 chars, unwieldy to share in chat.

### 4. `GET /by-code/:code` route ordering

Register before `GET /:id` in Express to avoid `"by-code"` being interpreted as a poll ID. Return only `{ question, channelId, guildId, liveTheme, resultTheme, options }` — no id, ownerId, runs, status, or shareCode.

### 5. Prefill via React Router state

`navigate('/poll/new', { state: { prefill: config } })` — `CreatePoll` reads `useLocation().state?.prefill` and uses it as initial form values. No URL params, no global state, no new context. State is lost on hard refresh which is fine — the user hasn't created anything yet.

### 6. End-poll navigation: Results instead of Edit

`LivePoll.tsx` `endMutation.onSuccess` currently navigates to `/poll/:id`. Change to `/poll/:id/results`. Same for the timer-based auto-end (`navigate` in the countdown effect already goes to results — no change needed there).

## Risks / Trade-offs

- **Code collision at scale** — 6 chars over `0-9a-z` = ~2 billion combinations. At <1000 polls, collision probability per generation is ~0.00005%. The 5-retry loop handles it.
- **Stale share codes** — if the owner edits or deletes the poll after sharing, old codes reflect the new state or 404. Intentional; documented as expected behavior.
- **Router state lost on refresh** — if the recipient hard-refreshes on `/poll/new`, prefill is gone. Acceptable: they just paste the code again.
- **`runs[0]` fix is a silent behavior change** — on a fresh single-run poll `runs[0]` happened to be the live run, so existing behavior is preserved. Only multi-run polls see a behavioral difference, which is the fix.

## Migration Plan

1. Run `bunx prisma migrate dev --name add-poll-share-code` (or `db push` in dev) to add `shareCode` column — nullable, no backfill
2. Deploy backend (new routes available, existing routes unchanged)
3. Deploy frontend (WS fix, Results run picker, new share UI)
4. No rollback complexity — share code column is additive; removing it requires a migration but no data loss
