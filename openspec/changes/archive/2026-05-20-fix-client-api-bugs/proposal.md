## Why

Two bugs in the client-server interface cause silent failures and console errors that degrade the user experience and make development harder to debug.

### Bug 1: PATCH vs PUT mismatch
`client/src/lib/api.ts` sends `PATCH /api/polls/:id` but the Express server only registers `router.put('/polls/:id')`. The CORS middleware also omits `PATCH` from allowed methods. Editing poll details (question, themes) from the React frontend silently 404s.

### Bug 2: Unhandled WebSocket `subscribe` message
The frontend WS hook sends `{ type: "subscribe", payload: { pollId } }` on connect and when `pollId` changes. The WS server has no handler for this type — it falls through to the default error case and sends `"Unknown message type: subscribe"` back to the client. The client never reads this error, but it clutters the WS console and indicates the server state is out of sync with what the client expects.

## What Changes

- **Bug 1**: Change `method: 'PATCH'` to `method: 'PUT'` in `client/src/lib/api.ts` line 54. The server already handles `PUT /polls/:id` correctly.
- **Bug 2**: Add a `subscribe` message handler in `src/server/ws/handlers.ts` that silently acknowledges the message (no-op). The server already broadcasts all poll updates to every connected WebSocket client, so subscription-based filtering isn't needed yet — this fix just stops the error response.

## Capabilities

### New Capabilities
*(none — both fixes are corrections to existing capabilities)*

### Modified Capabilities
- `api-polls`: The `PUT /polls/:id` endpoint was already correct; the client was sending the wrong HTTP method. No API contract change.
- `ws-realtime`: The WebSocket protocol now silently accepts `subscribe` messages instead of returning an error. No functional change to broadcast behavior.

## Impact

| File | Change |
|------|--------|
| `client/src/lib/api.ts` | Line 54: `method: 'PATCH'` → `method: 'PUT'` |
| `src/server/ws/handlers.ts` | Add `subscribe` case before `switch` — returns early with no response |
