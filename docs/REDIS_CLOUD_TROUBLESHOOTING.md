# Redis Cloud Connection Troubleshooting Guide

Based on the errors observed in your application logs, you need to properly configure your Redis Cloud connection. Follow these steps to resolve the connection issues:

## Step 1: Get Your Redis Cloud Credentials

1. Log in to your Redis Cloud account at [redis.com](https://redis.com/)
2. Navigate to your database instance
3. Note down the following information:
   - Host (endpoint): e.g., `redis-12345.c123.region.cloud.redislabs.com`
   - Port: e.g., `12345`
   - Password: Your database password
   - Whether TLS is required for your connection

## Step 2: Update Your `.env.redis-cloud` File

Replace the placeholder values in your `.env.redis-cloud` file with the actual Redis Cloud credentials:

```properties
# Redis Cloud configuration
REDIS_HOST=redis-12345.c123.region.cloud.redislabs.com  # Your actual Redis host
REDIS_PORT=12345  # Your actual Redis port
REDIS_PASSWORD=your-actual-password  # Your actual password
REDIS_USE_TLS=true  # Set to true if using TLS/SSL (recommended)
REDIS_ENABLED=true

# Connection settings
REDIS_RETRY_STRATEGY=true
REDIS_MAX_RETRIES=10
REDIS_CONNECT_TIMEOUT=30000
REDIS_KEEP_ALIVE=true

# Choose one based on your TLS setting and uncomment:
# For TLS connection (recommended for production):
REDIS_URL=rediss://:your-actual-password@redis-12345.c123.region.cloud.redislabs.com:12345

# For non-TLS connection:
# REDIS_URL=redis://default:your-actual-password@redis-12345.c123.region.cloud.redislabs.com:12345
```

## Step 3: Test Your Redis Cloud Connection

Run the enhanced Redis Cloud test script to verify your connection:

```bash
node scripts/enhanced-redis-cloud-test.js
```

If the connection is successful, you should see output confirming the connection and basic Redis operations.

## Step 4: Troubleshooting Common Issues

If you're still experiencing connection issues:

1. **DNS Resolution Issues**:
   - Verify the hostname is correct
   - Check your internet connection
   - Try pinging the host: `ping your-redis-host.redns.redis-cloud.com`

2. **Port Access Issues**:
   - Ensure your firewall isn't blocking the Redis port
   - Verify the port number is correct

3. **Authentication Issues**:
   - Double-check your password
   - Ensure the URL format is correct (pay attention to the colon and @ symbols)

4. **TLS/SSL Issues**:
   - If using TLS (`REDIS_USE_TLS=true`), make sure you use the `rediss://` protocol
   - If not using TLS, use the `redis://` protocol

## Step 5: Starting the Application with Redis Cloud

Once your connection test is successful, you can start your application using:

```bash
# On Windows
start-with-redis-cloud.bat

# On Linux/Mac
./start-with-redis-cloud.sh
```

## Need Further Help?

If you continue to experience issues after following these steps, check:
- Redis Cloud service status at [status.redis.com](https://status.redis.com/)
- Your Redis Cloud subscription limits and quotas
- Network connectivity between your environment and Redis Cloud