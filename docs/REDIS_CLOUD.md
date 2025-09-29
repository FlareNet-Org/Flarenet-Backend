# Redis Cloud Integration

This guide explains how to use Redis Cloud with the Flarenet Backend application.

## Overview

The Flarenet Backend can use either a local Redis instance (via Docker) or a Redis Cloud instance for caching and queuing operations. This document explains how to switch between these configurations and how to set up Redis Cloud.

## Configuration

### Environment Variables

The Redis connection is configured using environment variables. The following variables are used:

- `REDIS_URL`: (Preferred) Complete Redis connection URL (e.g., `redis://default:password@hostname:port`)
- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password
- `REDIS_USE_TLS`: Whether to use TLS for the connection (`true` or `false`)
- `REDIS_ENABLED`: Whether Redis is enabled at all (`true` or `false`)

### Configuration Files

- `.env`: Default Redis configuration (typically for local Docker instance)
- `.env.redis-cloud`: Redis Cloud configuration

## Setting Up Redis Cloud

1. Create a Redis Cloud account at [https://redis.com/try-free/](https://redis.com/try-free/)
2. Create a new database in your preferred region
3. Get the connection details from Redis Cloud dashboard
4. Update the `.env.redis-cloud` file with your connection details

### Updating `.env.redis-cloud`

```dotenv
# Redis Cloud configuration
REDIS_HOST=your-redis-instance.redns.redis-cloud.com
REDIS_PORT=15621
REDIS_PASSWORD=your-password
REDIS_USE_TLS=false
REDIS_ENABLED=true

# URL version (preferred)
REDIS_URL=redis://default:your-password@your-redis-instance.redns.redis-cloud.com:15621
```

## Testing Redis Cloud Connection

You can test your Redis Cloud connection with:

```bash
node scripts/test-redis-connection.js
```

This script will:
1. Connect to Redis Cloud
2. Perform basic Redis operations
3. Clean up test keys
4. Report success or failure

## Testing Queues with Redis Cloud

You can test that the queues work correctly with Redis Cloud:

```bash
node scripts/test-queues.js
```

This script will:
1. Test basic Redis connection
2. Create test queues and workers
3. Add test jobs to each queue
4. Process the jobs
5. Report success or failure

## Switching Between Local Redis and Redis Cloud

To use Redis Cloud:

1. Make sure your `.env.redis-cloud` file is properly configured
2. Start your application with:

```bash
# Linux/macOS
export NODE_ENV=production
node -r dotenv/config index.js dotenv_config_path=.env.redis-cloud

# Windows PowerShell
$env:NODE_ENV="production"
node -r dotenv/config index.js dotenv_config_path=.env.redis-cloud
```

To use local Redis:

1. Make sure your local Redis instance is running (typically via Docker Compose)
2. Start your application normally:

```bash
node index.js
```

## Troubleshooting

### Connection Issues

If you're having trouble connecting to Redis Cloud:

1. Verify your credentials and connection details
2. Check if TLS is required (set `REDIS_USE_TLS=true` if needed)
3. Ensure there are no network/firewall issues
4. Run the test scripts mentioned above for detailed error messages

### Queue Issues

If the queues aren't working correctly:

1. Make sure Redis Cloud is properly configured
2. Check if the eviction policy warning appears (Redis Cloud typically uses `volatile-lru` while BullMQ recommends `noeviction`)
3. Check Redis Cloud memory usage and limits
4. Run the queue test script for detailed diagnostics