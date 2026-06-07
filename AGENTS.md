# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-26
**Commit:** 4e517da
**Branch:** main

## OVERVIEW
Real-time Discord poll system. Bun/TypeScript backend (Discord.js + Express + WebSocket + Prisma) + React 19/Vite frontend (shadcn/ui). Single repo with separate `client/` package.

## STRUCTURE
```
polly/
├── src/                    # Bun backend
│   ├── index.ts            # Entry: starts bot + server
│   ├── env.ts              # Env config (NOT src/config/)
│   ├── events.ts          # EventEmitter bridge
│   ├── bot/                # Discord bot
│   ├── server/             # Express + WebSocket (ports 3000, 8080)
│   ├── api/                # REST routes
│   └── db/                 # Prisma client
├── client/                 # React frontend (separate package)
│   └── src/
│       ├── pages/          # Route pages
│       ├── components/ui/  # shadcn components
│       ├── contexts/       # React contexts
│       ├── hooks/          # Custom hooks
│       └── lib/            # Utilities
├── prisma/schema.prisma     # Database schema
├── docker-compose.yml       # PostgreSQL + app
└── Dockerfile              # Multi-stage Bun build
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Discord bot logic | `src/bot/` | EventEmitter-based |
| Vote capture | `src/bot/handlers/messageCreate.ts` | Single digit 1-9 only |
| WebSocket server | `src/server/` | ws library, port 8080 |
| WS auth | `src/server/ws/auth.ts` | Discord user ID validation |
| REST API | `src/api/routes/polls.ts` | Zod validation |
| DB operations | `src/db/client.ts` | Prisma singleton |
| React frontend | `client/src/` | Vite + React 19 |

## CONVENTIONS
- **Env config**: `src/env.ts` (NOT `src/config/env.ts`)
- **No ESLint on server**: Only `tsc` checks
- **Event bridge**: `events.ts` wires bot → server via EventEmitter
- **Docker**: Hardcoded postgres creds in docker-compose.yml (known issue)
- **Server runs 2 ports**: 3000 (HTTP), 8080 (WebSocket)

## ANTI-PATTERNS (THIS PROJECT)
- DO NOT use `as any` for type suppression
- DO NOT run production without Docker (env vars not validated outside container)
- DO NOT commit `.env` (contains secrets)

## UNIQUE STYLES
- **Two server.listen() calls** on different ports in `src/server/index.ts`
- **Discord.js v14** (not v15)
- **Zod v3 server**, Zod v4 client (version mismatch)
- **React 19** (bleeding edge)

## COMMANDS
```bash
bun run dev          # Start backend
bun run build        # Build to dist/
docker compose up -d # Full stack (recommended)
bun run db:push      # Push Prisma schema
bun run db:generate  # Generate Prisma client

cd client && bun run dev     # Frontend
cd client && bun run build   # Build frontend
```

## OPenspec (Spec-Driven Development)
OpenSpec is initialized in `openspec/`. Workflow: proposal → specs → design → tasks.

Commands:
- `openspec new change "<name>"` — start a new change
- `openspec status --change "<name>" --json` — check change progress
- `openspec instructions <artifact> --change "<name>" --json` — get artifact instructions
- `openspec list --json` — list all changes

Hermes skills loaded for this workflow:
- `openspec-propose` — create a new change with all artifacts
- `openspec-apply-change` — implement tasks from a change
- `openspec-archive-change` — archive a completed change
- `openspec-explore` — explore ideas before committing to a change

## NOTES
- Bot connects via `DISCORD_BOT_TOKEN` in `.env`
- Whitelist: `WHITELIST_USER_IDS` env var (comma-separated Discord user IDs)
- Vote parsing: single digit 1-9 only (111, 1a, 121 are invalid)
- `src/server/index.ts` has a lint issue: calls `server.listen()` twice
