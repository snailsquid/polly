# Architecture

## Overview

Polly is a minimal, MVP Discord poll system designed for live audiences. It prioritizes security, performance, and real-time updates.

## Requirements

### System Requirements

1. **Dockerized** - Single container deployment
2. **Security** - Protected system for live audiences (thousands of viewers)
3. **Minimal** - MVP scope, no bloat

---

## Backend

### Technology Choice

No strict preference - use best technology for the project requirements.

**Selected Stack:**
- **Runtime**: Node.js
- **Real-time**: WebSocket (ws library)
- **Database**: PostgreSQL
- **ORM**: Prisma (type-safe, minimal)

### Architecture Decisions

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Frontend  │◄──────────────────►│   Backend   │
│   (React)   │                    │  (Node.js) │
└─────────────┘                    └──────┬──────┘
                                          │
                                    ┌─────▼─────┐
                                    │ PostgreSQL│
                                    └───────────┘
                                          │
                                    ┌─────▼─────┐
                                    │  Discord  │
                                    │    Bot    │
                                    └───────────┘
```

### API Design

#### WebSocket Events

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `poll:start` | `{ pollId: string }` | Start a poll |
| `poll:end` | `{ pollId: string }` | End a poll |
| `poll:vote` | `{ pollId: string, vote: number }` | Register a vote |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `poll:started` | `{ poll: Poll }` | Poll has started |
| `poll:ended` | `{ poll: Poll, results: Results }` | Poll has ended |
| `poll:update` | `{ pollId: string, votes: VoteCount[] }` | Real-time vote update |

### REST Endpoints (Fallback)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/polls` | List all polls |
| `POST` | `/api/polls` | Create a poll |
| `GET` | `/api/polls/:id` | Get poll details |
| `POST` | `/api/polls/:id/import` | Import a poll |

---

## Frontend

### Technology

- **Framework**: React 18+
- **UI Library**: shadcn (Radix UI + Tailwind)
- **State**: React Query + Zustand
- **WebSocket**: Native WebSocket API

### Theme System

The theme system is **modular** and supports differentiation for votes 1-9:

```
themes/
├── live/
│   ├── bar/
│   ├── pie/
│   └── number/
└── result/
    ├── bar/
    ├── pie/
    └── number/
```

### Live Theme Requirements

- Must clearly distinguish between options 1-9
- Real-time updates without page refresh
- Optimized for large screens/projector display

### Result Theme Requirements

- Clear presentation of final vote counts
- Percentage or count display
- Responsive for various screen sizes

---

## Database Schema

### Poll

```prisma
model Poll {
  id          String   @id @default(cuid())
  question    String
  options     Option[]
  channelId   String
  guildId     String
  status      PollStatus @default(DRAFT)
  liveTheme   String
  resultTheme String
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Option {
  id      String @id @default(cuid())
  pollId  String
  poll    Poll   @relation(fields: [pollId], references: [id])
  number  Int
  label   String
  image   String?
}

enum PollStatus {
  DRAFT
  LIVE
  ENDED
}
```

### Vote

```prisma
model Vote {
  id        String   @id @default(cuid())
  pollId    String
  option    Int      // 1-9
  userId    String   // Discord user ID
  createdAt DateTime @default(now())
}
```

---

## Security

### Authentication

- Discord OAuth for user login
- User ID stored and compared against whitelist

### Authorization

- Only whitelisted Discord IDs can create/manage polls
- Bot runs with minimal required permissions

### Input Validation

- Vote numbers strictly validated (1-9 only)
- Message content parsed - only single digits accepted
- SQL injection prevented via parameterized queries (Prisma)

---

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: polly
      POSTGRES_USER: polly
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: .db_password
```

---

## Performance Considerations

- WebSocket for instant real-time updates
- Database indexes on `pollId` and `userId` for vote queries
- Minimal frontend bundle for fast loading
- Connection pooling for database access