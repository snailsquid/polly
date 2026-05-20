## Context

Two bugs were identified in the client-server interface during exploratory testing of the Polly application. Both are small, self-contained fixes that don't affect the backend logic or data model.

### Bug 1: PATCH vs PUT mismatch
The React frontend's `updatePoll()` function in `client/src/lib/api.ts` sends HTTP `PATCH` to `/api/polls/:id`, but the Express server only registers a `PUT` handler. The CORS middleware also omits `PATCH` from allowed methods.

### Bug 2: Unhandled WebSocket `subscribe`
The `useWebSocket` React hook sends `{ type: "subscribe", payload: { pollId } }` after authentication and when `pollId` changes. The WS server has no `subscribe` handler, so it falls through to the default error case.

## Goals / Non-Goals

**Goals:**
- Editing a poll from the React frontend works (returns 200, not 404)
- Connecting to WS no longer emits an `"Unknown message type: subscribe"` error

**Non-Goals:**
- No changes to the API contract or WS protocol
- No subscription-based filtering (server already broadcasts to all clients)
- No backend restructuring

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fix client or server for Bug 1? | **Fix client** (`PATCH` → `PUT`) | Server already handles `PUT` correctly. Changing the server to also handle `PATCH` would be redundant — only one caller sends PATCH. |
| Handle `subscribe` or remove it? | **Handle with silent no-op** | The client intentionally sends `subscribe` (future-proofing for per-poll subscriptions). Keeping it allows the frontend to later implement subscription-based filtering without changing the hook. |

## Risks / Trade-offs

- **Low risk**: Both changes are additive — no existing behavior is removed or altered.
- **No rollback needed**: If either fix causes issues, revert the single-line change.
