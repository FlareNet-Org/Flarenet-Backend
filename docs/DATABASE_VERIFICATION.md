# Guide to Verifying Redis and PostgreSQL Services

This guide helps you ensure both Redis Cloud and PostgreSQL services are properly configured and working in your Flarenet Backend project.

## Redis Cloud Verification

### 1. Configuration Files Check

First, verify your Redis Cloud configuration files:

```bash
# Make sure your .env.redis-cloud file exists and has the correct format
ls -la .env.redis-cloud

# Check if .env.redis-cloud is in .gitignore (to keep credentials secure)
grep ".env.redis-cloud" .gitignore
```

### 2. Environment Variables Check

Ensure your .env.redis-cloud file contains all necessary configuration:

* `REDIS_HOST` - Your Redis Cloud host address
* `REDIS_PORT` - Your Redis Cloud port (usually 15621)
* `REDIS_PASSWORD` - Your Redis Cloud password
* `REDIS_USE_TLS` - Whether to use TLS (true/false)
* `REDIS_URL` - Complete Redis connection URL

### 3. Connection Test

Run the enhanced Redis Cloud test script to verify connectivity:

```bash
# On Windows
node scripts/enhanced-redis-cloud-test.js

# On Linux/macOS
node scripts/enhanced-redis-cloud-test.js
```

A successful test will show:
- Connection established
- Key-value operations working
- Pub/sub functionality working
- List operations working
- Hash operations working

### 4. Redis Client Check

If you're having issues, check the Redis client implementation in `utils/redisClient.js`:

- Verify proper environment loading (Redis Cloud config has priority)
- Check connection options (retry settings, timeouts)
- Ensure proper error handling

### 5. Queue Integration Check

For BullMQ queues, ensure they're properly using Redis Cloud:

```bash
# Run the queue test script
node scripts/test-queues.js
```

## PostgreSQL Verification

### 1. Configuration Files Check

First, verify your PostgreSQL configuration files:

```bash
# Make sure your .env.development file exists
ls -la .env.development

# Check if .env.development is in .gitignore
grep ".env.development" .gitignore
```

### 2. Environment Variables Check

Ensure your .env.development file contains all necessary PostgreSQL configuration:

* `POSTGRES_USER` - Database user
* `POSTGRES_PASSWORD` - Database password
* `POSTGRES_DB` - Database name
* `DATABASE_URL` - Complete PostgreSQL connection URL

### 3. Database Connection Test

Run the database test script to verify connectivity:

```bash
# Run the database test
npm run test:db
```

### 4. Docker Compose Check

If using Docker, verify the PostgreSQL configuration in docker-compose files:

- Check that sensitive credentials are not hardcoded
- Verify environment variables are properly set

```bash
# Review the docker-compose configurations
cat docker-compose.yml
cat docker-compose.redis-cloud.yml
```

### 5. Prisma Integration Check

For Prisma client, check that it's properly connecting to PostgreSQL:

```bash
# Run Prisma database check
npx prisma db pull
```

## Security Verification

### 1. Check for Exposed Credentials

Search for any hardcoded credentials in your codebase:

```bash
# Search for passwords or URLs in the codebase
grep -r "password" --include="*.js" --include="*.yml" .
grep -r "REDIS_URL" --include="*.js" --include="*.yml" .
```

### 2. Docker Security Check

Ensure Docker files don't contain hardcoded credentials:

```bash
# Check Docker files for credentials
grep -r "password" --include="Dockerfile" --include="docker-compose*.yml" .
```

### 3. Git History Check

Make sure credentials weren't committed in the past:

```bash
# Search git history for potential credential commits
git log -p | grep -i "password\|secret\|key\|token"
```

## Troubleshooting

### Redis Connection Issues

1. **Connection Timeouts**:
   - Check network connectivity to Redis Cloud
   - Increase connection timeout in .env.redis-cloud
   - Verify firewall allows outbound connections

2. **Authentication Failures**:
   - Verify password in .env.redis-cloud
   - Check if the database exists in Redis Cloud console

### PostgreSQL Connection Issues

1. **Connection Failures**:
   - If using Docker, ensure the container is running
   - Verify connection string format
   - Check credentials in .env.development

2. **Prisma Migration Issues**:
   - Run `npx prisma migrate reset` to reset the database
   - Check schema.prisma for correct database provider

## Monitoring and Maintenance

### Redis Monitoring

1. Check Redis Cloud console for:
   - Connection metrics
   - Memory usage
   - Operation rates

2. Monitor in application:
   - Watch for repeated reconnection attempts in logs
   - Check for timeout errors

### PostgreSQL Monitoring

1. Check database status:
   - Connection count
   - Query performance
   - Database size

2. Regular maintenance:
   - Run `VACUUM` operations
   - Check index usage
   - Monitor for slow queries

## Conclusion

By following this guide, you should have verified both Redis and PostgreSQL configurations and ensured they're working properly and securely in your application.