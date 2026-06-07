# Server - HTTP + WebSocket

## OVERVIEW
Express REST API + ws WebSocket server. Two ports: 3000 (HTTP), 8080 (WS).

## KEY FILES
- `src/server/index.ts` - Bootstrap, dual port server.listen()
- `src/server/ws/handlers.ts` - WS message handlers
- `src/server/ws/auth.ts` - Discord user ID validation

## KNOWN ISSUES
- `server.listen()` called TWICE (lines 99-105) - lint issue
- No graceful error handling for WebSocket connections

## EVENTS LISTENED
- `poll:update` → broadcast to all connected WS clients
- `vote` → upsert to DB then emit poll:update
- `poll:started` → broadcast WS message
- `poll:ended` → broadcast WS message with final results
