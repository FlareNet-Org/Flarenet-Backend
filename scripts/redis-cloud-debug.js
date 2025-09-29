/**
 * Redis Cloud Connection Test (Debug)
 * 
 * This script provides detailed debug information about the Redis Cloud connection
 * and shows exactly what environment variables are being loaded and used.
 */

require('dotenv').config({ path: '.env.redis-cloud', override: true });
const Redis = require('ioredis');

console.log('====== REDIS CLOUD DEBUG TEST ======');
console.log('Environment variables loaded:');
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '******' : 'not set');
console.log('REDIS_USE_TLS:', process.env.REDIS_USE_TLS);
console.log('REDIS_URL:', process.env.REDIS_URL ? 'defined' : 'not defined');
if (process.env.REDIS_URL) {
    // Hide the actual password in the log
    const redisUrlParts = process.env.REDIS_URL.split('@');
    const authPart = redisUrlParts[0].split(':');
    const hiddenAuthPart = `${authPart[0]}:******`;
    const hiddenUrl = `${hiddenAuthPart}@${redisUrlParts[1]}`;
    console.log('REDIS_URL format:', hiddenUrl);
}

// Create a Redis client
console.log('\nInitializing Redis client...');
const redis = new Redis(process.env.REDIS_URL);

// Set up event handlers to monitor the connection
redis.on('connect', () => {
    console.log('✅ Connected to Redis Cloud!');
    
    // Test setting a value
    redis.set('test_connection', 'Connected at ' + new Date().toISOString())
        .then(() => {
            console.log('✅ Successfully set a test key');
            
            // Test getting the value
            return redis.get('test_connection');
        })
        .then((value) => {
            console.log(`✅ Successfully retrieved the test key: ${value}`);
            
            // Close the connection and exit
            redis.quit().then(() => {
                console.log('✅ Connection closed successfully');
                process.exit(0);
            });
        })
        .catch((err) => {
            console.error('❌ Error during Redis operations:', err);
            process.exit(1);
        });
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

console.log('Waiting for Redis connection...');