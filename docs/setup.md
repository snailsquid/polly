# Setup Guide

## Discord Bot Setup

### Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name (e.g., "Polly")
4. Click **"Create"**

### Step 2: Create a Bot User

1. In your application, go to the **"Bot"** tab in the left sidebar
2. Click **"Add Bot"**
3. Click **"Yes, do it!"**
4. Your bot is now created

### Step 3: Get the Bot Token

1. In the **Bot** tab, find the **Token** section
2. Click **"Reset Token"** if you don't see one
3. Copy the token (starts with `MT...` or similar)
4. **Important**: Never share this token publicly

### Step 4: Configure Bot Permissions

1. Go to the **OAuth2 > URL Generator** tab
2. Check the following scopes:
   - `bot`
   - `applications.commands`
3. In **Bot Permissions**, check:
   - `Read Message Content`
   - `Send Messages`
   - `View Channels`
4. Copy the generated URL

### Step 5: Invite the Bot to Your Server

1. Paste the URL from Step 4 into your browser
2. Select the Discord server you want to add the bot to
3. Click **"Authorize"**
4. Complete the CAPTCHA if prompted

### Step 6: Enable Message Content Intent

1. Go back to the **Bot** tab in Discord Developer Portal
2. Scroll to **Privileged Gateway Intents**
3. Enable **Message Content Intent**
4. Save changes

---

## Environment Configuration

### Getting Your Discord User ID

1. Enable Developer Mode in Discord:
   - Go to **User Settings > Advanced**
   - Turn on **Developer Mode**
2. Right-click on your username in any channel
3. Click **"Copy User ID"**

### Whitelist User IDs

The `WHITELIST_USER_IDS` variable accepts comma-separated Discord user IDs:

```env
# Single user
WHITELIST_USER_IDS=123456789012345678

# Multiple users (comma-separated, no spaces)
WHITELIST_USER_IDS=123456789012345678,987654321098765432,111222333444555666
```

**Important**: Spaces are automatically trimmed, so `123, 456` becomes `['123', '456']`.

---

## Complete .env Example

```env
# Discord bot token (from Step 3 above)
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.SfD9k.sOmErAnDoMtOkEnHeRe

# PostgreSQL connection string
DATABASE_URL=postgres://postgres:postgres@localhost:5432/polly

# WebSocket server port (default: 8080)
WS_PORT=8080

# HTTP REST port (default: 3000)
PORT=3000

# Your Discord user ID (or comma-separated list)
WHITELIST_USER_IDS=123456789012345678,987654321098765432
```

---

## Docker Deployment

```bash
# 1. Clone and configure
git clone https://github.com/hexagononyt/polly.git
cd polly
cp .env.example .env

# 2. Edit .env with your values
nano .env

# 3. Start the stack
docker compose up -d

# 4. Check logs
docker compose logs -f
```

---

## Verifying Setup

### Check Bot is Connected

Look for "Connected to Discord" in the logs:

```bash
docker compose logs app | grep -i connected
```

### Test the API

```bash
# Should return empty poll list after auth
curl http://localhost:3000/api/polls
```

### Check Health

```bash
curl http://localhost:3000/api/polls
```

---

## Troubleshooting

### Bot Won't Connect

- Verify the token is correct (no extra spaces)
- Ensure Message Content Intent is enabled
- Check the bot is invited to a server

### "Unauthorized" Errors

- Verify your Discord User ID is in `WHITELIST_USER_IDS`
- User IDs are numbers, not usernames
- Separate multiple IDs with commas only

### Database Connection Issues

- Ensure PostgreSQL is running: `docker compose ps`
- Check `DATABASE_URL` format is correct
- Wait for postgres to be healthy before app starts