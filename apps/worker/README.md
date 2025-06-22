# User Ban Expiration Worker

This worker automatically unlocks user accounts when their ban expiration time has passed.

## Features

- Automatically checks for expired bans every 5 minutes
- Unlocks users whose `banExpires` time has passed
- Clears ban reason and expiration date when unlocking
- Logs all actions for monitoring

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set environment variables:
```bash
DATABASE_URL=your_database_connection_string
```

## Running the Worker

### Development
```bash
bun run dev
```

### Production
```bash
bun start
```

## How it Works

The worker runs a continuous loop that:

1. Queries the database for users with `banned = true` and `banExpires < now()`
2. Updates those users to set `banned = false`, `banReason = null`, and `banExpires = null`
3. Logs the actions for monitoring
4. Waits 5 minutes before checking again

## Monitoring

The worker logs:
- When it starts checking for expired bans
- How many expired bans were found
- Each user that gets unlocked
- Any errors that occur during processing

## Integration with Admin Panel

The admin panel automatically refreshes the user list every 30 seconds, so you'll see unlocked users appear in the interface without manual refresh. 