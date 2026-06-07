## 1. Database Schema

- [x] 1.1 Add `shareCode String? @unique` to `Poll` model in `prisma/schema.prisma`
- [x] 1.2 Run `bunx prisma migrate dev --name add-poll-share-code` (or `db push` in dev) to apply migration

## 2. Backend — Share Code Endpoints

- [x] 2.1 Add `POST /polls/:id/share-code` route in `src/api/routes/polls.ts` — generates a 6-char alphanumeric nanoid, collision-checks against DB (up to 5 retries), saves to `poll.shareCode`, returns `{ shareCode }`
- [x] 2.2 Add `GET /polls/by-code/:code` route in `src/api/routes/polls.ts` — register before `GET /:id` to avoid shadowing; returns `{ question, channelId, guildId, liveTheme, resultTheme, options }` with no id/ownerId/runs; responds 404 if code not found

## 3. Types & API Client

- [x] 3.1 Add `shareCode?: string | null` to `Poll` interface in `client/src/types/index.ts`
- [x] 3.2 Add `generateShareCode(pollId: string): Promise<{ shareCode: string }>` to `client/src/lib/api.ts`
- [x] 3.3 Add `getPollByCode(code: string): Promise<PollTemplate>` to `client/src/lib/api.ts` where `PollTemplate` is a new type `{ question, channelId, guildId, liveTheme, resultTheme, options }`

## 4. Bug Fix — WebSocket Run Selection

- [x] 4.1 In `client/src/hooks/useWebSocket.ts:55`, replace `payload.runs[0].votes` with `payload.runs.find(r => r.status === 'LIVE')?.votes ?? []`

## 5. Bug Fix — Results Page Run Picker

- [x] 5.1 In `client/src/pages/Results.tsx`, add `selectedRunId` state defaulting to the latest ENDED run's id
- [x] 5.2 Replace the `flatMap` vote aggregation with per-run vote computation scoped to `selectedRunId`
- [x] 5.3 Add run selector dropdown (only rendered when poll has 2+ ENDED runs) that updates `selectedRunId`
- [x] 5.4 Update total vote count display to reflect the selected run only

## 6. Feature — Poll Restart from Results

- [x] 6.1 In `client/src/pages/Results.tsx`, add `startMutation` using `startPoll(id)` that navigates to `/poll/:id/live` on success
- [x] 6.2 Replace the "Start Another Run" `navigate` call with `startMutation.mutate()` — show only when `isOwner` and no LIVE run exists
- [x] 6.3 Add `startPoll` import to `client/src/lib/api.ts` imports in Results.tsx (already exported)

## 7. Feature — End Poll Navigates to Results

- [x] 7.1 In `client/src/pages/LivePoll.tsx`, change `endMutation.onSuccess` to navigate to `/poll/${id}/results` instead of `/poll/${id}`

## 8. Feature — Copy Code on PollDetail

- [x] 8.1 In `client/src/pages/PollDetail.tsx`, add "Copy code" button visible only to the poll owner
- [x] 8.2 On click: if `poll.shareCode` is already set, copy it directly; otherwise call `generateShareCode(poll.id)`, then copy the returned code
- [x] 8.3 Show toast `"Code copied: <code>"` after clipboard write

## 9. Feature — Paste from Code on Home

- [x] 9.1 In `client/src/pages/Home.tsx`, replace the "Import" button and dialog with a "Paste from code" button and dialog containing a single code input field
- [x] 9.2 On submit: call `getPollByCode(code)`, on success navigate to `/poll/new` with `{ state: { prefill: config } }`, on 404 show inline error "Code not found"
- [x] 9.3 Remove the `importPoll` API call and mutation from `Home.tsx` (keep the backend route, remove UI entry point)

## 10. Feature — CreatePoll Prefill from Router State

- [x] 10.1 In `client/src/pages/CreatePoll.tsx`, read `useLocation().state?.prefill` on mount and use it to set initial values for question, channelId, guildId, liveTheme, resultTheme, and options if present
