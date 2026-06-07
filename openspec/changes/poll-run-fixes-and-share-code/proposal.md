## Why

The multi-run data model (`Poll` → `PollRun[]`) was built to support restarting polls, but two bugs make it unreliable in practice: the WebSocket handler always reads the oldest run's votes instead of the live run's, and the Results page silently merges all runs into one chart. These make multi-run polls broken by default. The shareable-code feature also lands here because it uses the same "poll as template" mental model — once restart works correctly, sharing a poll template is the natural next step.

## What Changes

- **Fix** `client/src/hooks/useWebSocket.ts:55` — select the `LIVE` run from `payload.runs` instead of `runs[0]` (oldest)
- **Fix** `client/src/pages/Results.tsx:141` — replace `flatMap` across all ENDED runs with a per-run selector (dropdown, default = latest ENDED run)
- **Fix** `client/src/pages/Results.tsx:205` — "Start Another Run" button actually calls `startPoll()` and navigates to live, instead of just navigating to the edit page
- **Add** `shareCode String? @unique` to `Poll` schema (`prisma/schema.prisma`) — generated lazily on first share, not at creation
- **Add** `POST /api/polls/:id/share-code` — generates and persists the short code, returns it
- **Add** `GET /api/polls/by-code/:code` — returns poll template config (no runs, votes, owner, or id)
- **Replace** Home page "Import by ID" dialog with "Paste from code" — calls `GET /by-code/:code`, prefills the Create form via router state
- **Add** "Copy code" button to `PollDetail` — lazy-generates and copies the short code to clipboard
- **Update** `CreatePoll` to read prefill state from router location and use it as initial form values

## Capabilities

### New Capabilities

- `poll-run-results`: Per-run result viewing with run picker on the Results page; votes are scoped to a single selected run, not merged across runs
- `poll-restart`: Restarting a finished poll from the Results page actually starts a new run and navigates to live
- `poll-share-code`: Owner generates a short share code for a poll; recipient enters the code to prefill the Create form with the poll's template config

### Modified Capabilities

None — no existing spec files to delta against.

## Impact

**Database:** one new nullable unique column on `Poll` — requires `prisma migrate` or `db push`

**Backend:** two new routes in `src/api/routes/polls.ts`; `GET /by-code/:code` must be registered before `GET /:id` to avoid route shadowing

**Frontend:**
- `client/src/hooks/useWebSocket.ts` — run selection logic
- `client/src/pages/Results.tsx` — run picker, vote scoping, "Start Another Run" wiring
- `client/src/pages/Home.tsx` — replace Import dialog with Paste-from-code dialog
- `client/src/pages/PollDetail.tsx` — "Copy code" button
- `client/src/pages/CreatePoll.tsx` — read prefill from router state
- `client/src/lib/api.ts` — two new API calls (`generateShareCode`, `getPollByCode`)
- `client/src/types/index.ts` — add `shareCode?: string | null` to `Poll`

**No breaking changes** to existing REST endpoints or WebSocket protocol.
