# User Guide

## Table of Contents

1. [Admin Setup](#admin-setup)
2. [Login/Register](#loginregister)
3. [Creating a Poll](#creating-a-poll)
4. [Importing a Poll](#importing-a-poll)
5. [Starting a Poll](#starting-a-poll)
6. [Ending a Poll](#ending-a-poll)

---

## Admin Setup

### Starting the Server

1. Admin runs the program
2. Admin sets up Discord bot to connect to the Discord API using `.env`
3. Admin runs the bot

### Prerequisites

- Valid Discord bot token with appropriate permissions
- Access to target Discord servers
- Bot must be able to read message content in configured channels

---

## Login/Register

### Authentication Flow

1. User is shown the title of the app
2. User presses "Login with Discord" button
3. System identifies the Discord user by their ID
4. System compares the ID against the whitelist
5. **Only whitelisted IDs are granted access**

### Security Note

This system is designed to be shown live to thousands of technical viewers. Access is strictly controlled via Discord ID whitelist.

---

## Creating a Poll

### Poll Creation Workflow

1. From the **Home** screen, user presses "Create a Poll"
2. User sets up the channel to receive messages
3. Server verifies the bot has access to that server/channel
4. User enters the poll question
5. User configures answers (1-9 options, optionally with images)
6. User selects a **Live Theme** for real-time display
7. User selects a **Result Theme** for final results

### Real-time Updates

> **NFR (Non-Functional Requirement)**: Every change is automatically saved - no need to press a save button.

---

## Importing a Poll

### Import Workflow

1. From the **Home** screen, user presses "Import"
2. System shows a text input prompt
3. User pastes the Poll ID
4. User presses "Create" on the prompt
5. System retrieves the Poll from the database
6. System duplicates the Poll and assigns ownership to the current user
7. User is redirected to **Poll Creation** screen with duplicated data

---

## Starting a Poll

### Starting from Home Screen (Option 1)

1. From **Home**, user presses the Poll title on the desired Poll entry
2. User is taken to **Poll Creation** screen
3. User presses "Start"
4. Bot checks if server already has a running poll on the configured channel
   - If a poll exists → **Fail** (do not start)
   - If channel is free → **Continue**
5. Bot starts capturing messages on the configured channel
6. For each number (1-9) received:
   - If the message contains ONLY that number → Add entry to poll
   - If the message contains other characters → **Ignore**
   - Examples: `111` ✅ valid, `121` ❌ invalid
7. User is shown the **Live Theme** for real-time poll display

### Starting from Poll Entry (Option 2)

1. From **Home**, user presses "Start" button on the Poll entry
2. Same validation checks as above apply
3. User is shown the **Live Poll** screen

---

## Ending a Poll

### End Workflow

1. User presses the "End Poll" button
2. System switches to **Result Theme** displaying final results
3. Bot stops capturing messages from the channel

---

## Theme System

### Live Themes

Used during active polling to show real-time vote counts to the audience.

### Result Themes

Used after poll ends to present final results in an appealing format.

### Theme Requirements

- Themes must be modular
- Themes must clearly differentiate votes 1-9
- Themes update in real-time via WebSocket connection

---

## Discord Integration

### Bot Permissions Required

- Read Message Content
- View Channel (for configured channels)

### Message Parsing Rules

The bot captures votes by analyzing Discord messages:

| Message Content | Interpretation |
|-----------------|-----------------|
| `1` | Vote for option 1 ✅ |
| `7` | Vote for option 7 ✅ |
| `123` | Invalid - contains multiple digits ❌ |
| `1a` | Invalid - contains non-digit character ❌ |
| ` 5 ` | Vote for option 5 ✅ (whitespace trimmed) |

---

## Security Considerations

- All administrative functions require whitelisted Discord IDs
- Bot token stored securely in environment variables
- Database credentials never exposed to frontend
- Real-time updates via authenticated WebSocket connections