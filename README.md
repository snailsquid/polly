# Polly - Discord Poll Bot

Real-time Discord poll system for live audiences. Create, manage, and display polls during streams or events with high-speed WebSocket updates.

## Features

- **Real-time Voting** - Capture numbers 1-9 from Discord channels
- **Whitelist Protection** - Only authorized users can create and manage polls
- **Live Themes** - Customizable live display themes
- **Result Themes** - Beautiful result presentations
- **Docker Ready** - Single command deployment
- **WebSocket Powered** - Instant updates for all connected clients

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- Docker & Docker Compose
- Discord account

### Installation

```bash
# Clone the repository
git clone https://github.com/hexagononyt/polly.git
cd polly

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your Discord bot token

# Start with Docker
docker compose up -d
```

## Setup

Follow the [Setup Guide](docs/setup.md) for:
- Creating a Discord bot and getting your token
- Inviting the bot to your server
- Configuring environment variables

## Documentation

- [Setup Guide](docs/setup.md) - Discord bot configuration
- [User Guide](docs/user-guide.md) - Detailed workflow documentation
- [Architecture](docs/architecture.md) - System design and technical specs

## Tech Stack

- **Runtime**: Bun with TypeScript
- **Discord**: discord.js v14
- **Database**: PostgreSQL + Prisma ORM
- **Container**: Docker & Docker Compose

## Development

```bash
# Run in development mode
bun run dev

# Build for production
bun run build

# Database operations
bun run db:generate  # Generate Prisma client
bun run db:push      # Push schema to database
```

## License

MIT
