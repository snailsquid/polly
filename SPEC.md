# Polly Backend - Technical Specification

## Overview

Backend for real-time Discord poll system. Handles Discord bot events, WebSocket clients (frontend), and poll state management.

## Tech Stack

- **Runtime**: Bun with TypeScript
- **Discord**: discord.js v14
- **Database**: PostgreSQL + Prisma ORM
- **WebSocket**: ws library
- **HTTP**: Express.js (REST fallback)
- **Container**: Docker + Docker Compose

## Functionality

### 1. Discord Bot

- Connect using `DISCORD_BOT_TOKEN` from `.env`
- Listen to messages in configured channels
- Parse vote messages (single digit 1-9 only)
- Ignore messages with multiple digits or non-digits (e.g., `111`, `1a`, `121` are invalid)
- Broadcast votes to WebSocket clients in real-time

### 2. WebSocket Server

- Run on port 8080 (or `WS_PORT` from env)
- Authenticate clients via Discord user ID + token
- Events:
  - `poll:start` - Start a poll (validates channel availability)
  - `poll:end` - End a poll
  - `poll:update` - Real-time vote counts (server → client)
  - `poll:started` - Poll started confirmation
  - `poll:ended` - Poll ended with results

### 3. REST API

- `GET /api/polls` - List polls
- `POST /api/polls` - Create poll
- `GET /api/polls/:id` - Get poll details
- `PUT /api/polls/:id` - Update poll
- `DELETE /api/polls/:id` - Delete poll
- `POST /api/polls/:id/start` - Start poll
- `POST /api/polls/:id/end` - End poll
- `POST /api/polls/:id/import` - Import poll by ID

### 4. Authentication & Whitelist

- Discord user ID sent with WebSocket/REST requests
- Check against `WHITELIST_USER_IDS` env var (comma-separated list of Discord user IDs)
- Example: `WHITELIST_USER_IDS=123456789,987654321`
- Only whitelisted users can create/modify polls

## Data Model

### Poll

```
id          String     @id @default(cuid())
question    String
channelId   String
guildId     String
status      Enum       (DRAFT, LIVE, ENDED)
liveTheme   String     @default("bar")
resultTheme String     @default("bar")
ownerId     String
createdAt   DateTime
updatedAt   DateTime
options     Option[]
votes       Vote[]
```

### Option

```
id      String @id @default(cuid())
pollId  String
number  Int    (1-9)
label   String
image   String?
```

### Vote

```
id        String   @id @default(cuid())
pollId    String
option    Int      (1-9)
userId    String   (Discord user ID)
createdAt DateTime
```

## Environment Variables

```
DISCORD_BOT_TOKEN=    # Discord bot token
DATABASE_URL=          # PostgreSQL connection string
WS_PORT=8080           # WebSocket server port
WHITELIST_USER_IDS=    # Comma-separated Discord user IDs
PORT=3000              # HTTP REST port
```

## Project Structure

```
src/
  index.ts              # Entry point
  bot/
    index.ts             # Discord bot setup
    handlers/
      messageCreate.ts   # Vote capture logic
  server/
    index.ts             # Express + WebSocket server
    ws/
      handlers.ts        # WebSocket message handlers
      auth.ts            # Ws authentication
  api/
    routes/
      polls.ts           # REST poll endpoints
    middleware/
      auth.ts            # Auth middleware
  db/
    client.ts            # Prisma client
```

## Docker Configuration

- `Dockerfile`: Bun Alpine, production build
- `docker-compose.yml`: App + PostgreSQL + volumes

## Acceptance Criteria

- [ ] Bot connects to Discord and logs "Connected"
- [ ] Bot captures valid single-digit messages in configured channels
- [ ] Bot ignores invalid messages (multi-digit, non-digit)
- [ ] WebSocket server starts and accepts connections
- [ ] Whitelist rejects non-authorized users
- [ ] Poll CRUD operations work via REST
- [ ] Poll start/end broadcasts to all WS clients
- [ ] Votes are persisted to database
- [ ] Docker Compose starts entire stack
- [ ] Build compiles without errors