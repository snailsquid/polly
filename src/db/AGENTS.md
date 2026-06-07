# DB - Prisma Client

## OVERVIEW
Prisma singleton for PostgreSQL. Single file: `src/db/client.ts`.

## SCHEMA
- `Poll` - question, channelId, guildId, status (DRAFT/LIVE/ENDED), themes
- `Option` - pollId, number (1-9), label, image?
- `Vote` - pollId, option (1-9), userId (Discord), unique on [pollId, userId]

## CLIENT USAGE
```ts
import { prisma } from '../db/client';
// Use directly - singleton pattern
```
