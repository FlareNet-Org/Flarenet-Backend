const { Queue } = require('bullmq');
const path = require('path');
const dotenv = require('dotenv');

// Explicitly load Redis Cloud environment variables first, then fall back to default .env
const redisCloudPath = path.resolve(__dirname, '..', '.env.redis-cloud');
const defaultEnvPath = path.resolve(__dirname, '..', '.env');

// Load Redis Cloud config with higher priority
dotenv.config({ path: redisCloudPath });
dotenv.config({ path: defaultEnvPath });

console.log('failedQueue: Redis environment loaded from:', redisCloudPath);
console.log('failedQueue: Redis URL from env:', process.env.REDIS_URL ? 'YES (defined)' : 'NO (undefined)');

// Configure connection for Redis
const connectionConfig = process.env.REDIS_URL 
    ? { 
        url: process.env.REDIS_URL,
        tls: process.env.REDIS_USE_TLS === 'true' ? { rejectUnauthorized: false } : undefined
    } 
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_USE_TLS === 'true' ? { rejectUnauthorized: false } : undefined
    };

// Create the failed queue with the connection configuration
const failedQueue = new Queue('failedQueue', {
    connection: connectionConfig
});

module.exports = failedQueue;