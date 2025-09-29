/**
 * Enhanced Redis Cloud Connection Test
 * 
 * This script tests the connection to Redis Cloud with enhanced error handling and 
 * connection management. It includes robust retry logic and better diagnostics.
 */

// Import required modules
require('dotenv').config({ path: '.env.redis-cloud' });
const Redis = require('ioredis');

// Log the Redis configuration
console.log('====== Redis Cloud Connection Test ======');
console.log('Redis Host:', process.env.REDIS_HOST);
console.log('Redis Port:', process.env.REDIS_PORT);
console.log('Redis URL:', process.env.REDIS_URL ? 'Defined' : 'Undefined');
console.log('Redis TLS:', process.env.REDIS_USE_TLS);
console.log('Redis Retry Strategy:', process.env.REDIS_RETRY_STRATEGY);
console.log('Redis Max Retries:', process.env.REDIS_MAX_RETRIES);
console.log('Redis Connect Timeout:', process.env.REDIS_CONNECT_TIMEOUT);
console.log('Redis Keep Alive:', process.env.REDIS_KEEP_ALIVE);
console.log('======================================');

// Configure Redis connection options
const connectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  reconnectOnError: (err) => {
    console.log(`Redis reconnect triggered due to error: ${err.message}`);
    return err.message.includes('READONLY') || err.message.includes('ETIMEDOUT');
  },
  retryStrategy: (times) => {
    if (process.env.REDIS_RETRY_STRATEGY !== 'true') {
      return null;
    }
    
    const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '10', 10);
    const delay = Math.min(times * 500, 10000);
    console.log(`Redis retry strategy: attempt ${times}/${maxRetries}, delaying ${delay}ms`);
    if (times > maxRetries) {
      console.log(`Redis connection failed after ${maxRetries} retries, will stop retrying`);
      return null;
    }
    return delay;
  },
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '30000', 10),
  disconnectTimeout: 5000,
  keepAlive: process.env.REDIS_KEEP_ALIVE === 'true' ? 10000 : 0
};

// Create Redis client
let redisClient;
if (process.env.REDIS_URL) {
  console.log('Connecting to Redis using connection URL');
  redisClient = new Redis(process.env.REDIS_URL, connectionOptions);
} else {
  console.log('Connecting to Redis using individual parameters');
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ...connectionOptions,
    tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined
  };
  redisClient = new Redis(redisConfig);
}

// Set up event handlers
redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
  if (err.code === 'ECONNREFUSED') {
    console.log('Connection to Redis refused. Check if Redis server is running and accessible.');
  } else if (err.code === 'ETIMEDOUT') {
    console.log('Connection to Redis timed out. Check network connectivity and firewall settings.');
  }
});

redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisClient.on('ready', () => {
  console.log('Redis client is ready');
  
  // Run test operations
  runTests()
    .then(() => {
      console.log('Tests completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Test failed:', err);
      process.exit(1);
    });
});

redisClient.on('reconnecting', (delay) => {
  console.log(`Redis reconnecting in ${delay}ms...`);
});

redisClient.on('end', () => {
  console.log('Redis connection ended');
});

// Test Redis operations
async function runTests() {
  console.log('\nRunning Redis operations tests...');
  
  // Test 1: Set a key
  console.log('Test 1: Setting a key...');
  await redisClient.set('test:connection', `Connected at ${new Date().toISOString()}`);
  console.log('✓ Key set successfully');
  
  // Test 2: Get the key
  console.log('Test 2: Getting the key...');
  const value = await redisClient.get('test:connection');
  console.log(`✓ Key retrieved successfully: ${value}`);
  
  // Test 3: Test pub/sub
  console.log('Test 3: Testing pub/sub...');
  const subscriber = redisClient.duplicate();
  
  await new Promise((resolve) => {
    subscriber.on('ready', () => {
      console.log('Subscriber ready');
      
      subscriber.subscribe('test-channel', () => {
        console.log('Subscribed to test-channel');
        
        // Publish a message
        redisClient.publish('test-channel', 'Hello from Redis Cloud test')
          .then(() => {
            console.log('Message published');
          });
      });
      
      subscriber.on('message', (channel, message) => {
        console.log(`✓ Received message on ${channel}: ${message}`);
        subscriber.unsubscribe('test-channel');
        subscriber.quit();
        resolve();
      });
    });
  });
  
  // Test 4: Test list operations
  console.log('Test 4: Testing list operations...');
  await redisClient.lpush('test:list', 'item1');
  await redisClient.lpush('test:list', 'item2');
  await redisClient.lpush('test:list', 'item3');
  
  const listItems = await redisClient.lrange('test:list', 0, -1);
  console.log(`✓ List items: ${listItems.join(', ')}`);
  
  // Test 5: Test hash operations
  console.log('Test 5: Testing hash operations...');
  await redisClient.hset('test:hash', 'field1', 'value1');
  await redisClient.hset('test:hash', 'field2', 'value2');
  
  const hashValue = await redisClient.hgetall('test:hash');
  console.log(`✓ Hash values:`, hashValue);
  
  // Test 6: Clean up
  console.log('Test 6: Cleaning up test keys...');
  await redisClient.del('test:connection');
  await redisClient.del('test:list');
  await redisClient.del('test:hash');
  console.log('✓ Test keys cleaned up');
  
  // Close the client
  await redisClient.quit();
  console.log('All tests passed successfully!');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Caught interrupt signal, closing Redis connection...');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});