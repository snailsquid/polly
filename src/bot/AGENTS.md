# Bot - Discord Bot

## OVERVIEW
discord.js v14 bot with EventEmitter-based event bridge.

## KEY FILES
- `src/bot/index.ts` - Client setup, intents, ready handler
- `src/bot/handlers/messageCreate.ts` - Vote parsing (digits 1-9 only)
- `src/events.ts` - EventEmitter shared with server

## VOTE PARSING
Single digit 1-9 only. Invalid: `111`, `1a`, `121`.

## EVENTS EMITTED
- `vote` → `{pollId, option, userId}`
- `poll:start` → `{pollId}`
- `poll:end` → `{pollId}`
