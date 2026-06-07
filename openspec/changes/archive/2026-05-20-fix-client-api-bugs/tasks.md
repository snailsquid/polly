## 1. Fix PATCH vs PUT mismatch (Client)

- [x] 1.1 Change `client/src/lib/api.ts` line 54 from `method: 'PATCH'` to `method: 'PUT'`

## 2. Fix unhandled WebSocket subscribe

- [x] 2.1 Add `subscribe` handler in `src/server/ws/handlers.ts` before the default switch — silently return with no error
