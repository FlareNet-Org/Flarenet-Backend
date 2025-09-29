# Redis Cloud Setup and Configuration

This guide explains how to set up and configure Redis Cloud for the Flarenet Backend project. Redis Cloud is a fully managed cloud-based Redis service that provides high availability, scalability, and persistence.

## Prerequisites

- A Redis Cloud account (can be created at [redis.com](https://redis.com/))
- The connection details for your Redis Cloud database (host, port, password)

## Configuration Files

### Environment Files

The project uses the following environment files for Redis Cloud configuration:

- `.env.redis-cloud`: Contains specific Redis Cloud connection parameters
- `start-with-redis-cloud.bat/sh`: Scripts to start the application with Redis Cloud
- `docker-compose.redis-cloud.yml`: Docker Compose configuration for Redis Cloud

## Setting Up Redis Cloud

1. Create a Redis Cloud account and database
2. Update the `.env.redis-cloud` file with your connection details:

```properties
# Redis Cloud configuration
REDIS_HOST=your-redis-host.redns.redis-cloud.com
REDIS_PORT=your-port
REDIS_PASSWORD=your-password
REDIS_USE_TLS=false  # Set to true if using TLS
REDIS_ENABLED=true

# Connection settings
REDIS_RETRY_STRATEGY=true
REDIS_MAX_RETRIES=10
REDIS_CONNECT_TIMEOUT=30000
REDIS_KEEP_ALIVE=true

# Non-TLS version (DO NOT include real password in repository)
REDIS_URL=redis://default:your-password@your-redis-host.redns.redis-cloud.com:your-port
```

> **IMPORTANT:** Never commit the actual values of `REDIS_PASSWORD` or the full `REDIS_URL` to the repository. Keep these sensitive values in a local `.env.redis-cloud` file that is listed in `.gitignore`.

## Connection Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| REDIS_RETRY_STRATEGY | Enable automatic retry on connection failure | true |
| REDIS_MAX_RETRIES | Maximum number of retry attempts | 10 |
| REDIS_CONNECT_TIMEOUT | Connection timeout in milliseconds | 30000 |
| REDIS_KEEP_ALIVE | Enable TCP keepalive | true |

## Starting the Application with Redis Cloud

### Windows

```powershell
.\start-with-redis-cloud.bat
```

### Unix/Linux/macOS

```bash
./start-with-redis-cloud.sh
```

### Docker

```bash
docker-compose -f docker-compose.redis-cloud.yml up
```

## Testing Redis Cloud Connection

The project includes a test script to verify the Redis Cloud connection:

```bash
node scripts/enhanced-redis-cloud-test.js
```

This script tests:
- Basic connection
- Key-value operations
- Pub/Sub functionality
- List operations
- Hash operations

## Troubleshooting

### Connection Issues

1. **ETIMEDOUT errors**: 
   - Check your network connection
   - Ensure your firewall allows outbound connections to the Redis Cloud port
   - Increase the connection timeout by setting a higher `REDIS_CONNECT_TIMEOUT` value

2. **Authentication failures**:
   - Verify your password in `.env.redis-cloud`
   - Check if the Redis Cloud database has password authentication enabled

3. **TLS/SSL Issues**:
   - Ensure `REDIS_USE_TLS` is set correctly based on your Redis Cloud configuration

## Architecture Notes

The Redis client is configured in `utils/redisClient.js` with robust connection handling:

- Automatic reconnection
- Error handling
- Connection event logging
- Configurable retry strategy

## Free Tier Limitations

If using the Redis Cloud free tier, be aware of these limitations:

- 30MB database size limit
- Limited concurrent connections
- Potential connection throttling
- No persistence guarantees

For production use, consider upgrading to a paid plan based on your needs.

## Additional Resources

- [Redis Cloud Documentation](https://docs.redis.com/latest/rc/)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [BullMQ Documentation](https://docs.bullmq.io/)