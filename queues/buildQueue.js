const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Environment variables are loaded by index.js
console.log('buildQueue: Redis URL configured:', process.env.REDIS_URL ? 'YES' : 'NO');

// Create Redis connection for BullMQ
const getRedisConnection = () => {
    if (process.env.REDIS_URL) {
        return new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });
    }
    return new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    });
};

// Create the build queue with the connection configuration
const buildQueue = new Queue('buildQueue', {
    connection: getRedisConnection()
});

module.exports = buildQueue;