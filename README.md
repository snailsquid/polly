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

- Node.js 20+
- Docker & Docker Compose
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

### Installation

```bash
# Clone the repository
git clone https://github.com/hexagononyt/polly.git
cd polly

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord bot token

# Start with Docker
docker-compose up -d
```

### Configuration

Create a `.env` file:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgres://user:pass@localhost:5432/polly
```

## Documentation

- [User Guide](docs/user-guide.md) - Detailed workflow documentation
- [Architecture](docs/architecture.md) - System design and technical specs

## Tech Stack

- **Backend**: Node.js with WebSocket support
- **Frontend**: React with shadcn UI components
- **Database**: PostgreSQL
- **Container**: Docker & Docker Compose

## License

MIT