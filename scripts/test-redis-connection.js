/**
 * Redis Cloud Connection Test
 * 
 * This script tests the connection to Redis Cloud
 * and performs basic operations to ensure proper functionality.
 */

// Load environment variables from special Redis Cloud env file
require('dotenv').config({ path: '.env.redis-cloud' });

// Import Redis client
const { getRedisClient } = require('../utils/redisClient');

// Main test function
async function testRedisConnection() {
  console.log('Testing Redis Cloud connection...');
  
  try {
    // Get Redis client
    const redis = getRedisClient();
    
    if (!redis) {
      console.error('Failed to initialize Redis client');
      process.exit(1);
    }
    
    // Wait for the client to be ready
    if (redis.status !== 'ready') {
      console.log('Waiting for Redis connection to be ready...');
      await new Promise((resolve) => {
        redis.once('ready', () => {
          console.log('Redis connection is now ready');
          resolve();
        });
        
        // Set a timeout in case the connection never becomes ready
        setTimeout(() => {
          console.error('Timeout waiting for Redis connection');
          process.exit(1);
        }, 5000);
      });
    }
    
    // Test basic operations
    console.log('Setting test key...');
    await redis.set('test_key', 'Redis Cloud Connection Test Successful');
    
    console.log('Getting test key...');
    const value = await redis.get('test_key');
    
    console.log('Test key value:', value);
    
    if (value === 'Redis Cloud Connection Test Successful') {
      console.log('✅ Redis Cloud connection test passed!');
    } else {
      console.error('❌ Redis Cloud connection test failed!');
    }
    
    // Test list operations (used by queues)
    console.log('Testing list operations...');
    await redis.del('test_list');
    await redis.lpush('test_list', 'item1', 'item2', 'item3');
    const listLength = await redis.llen('test_list');
    console.log(`List length: ${listLength} (expected: 3)`);
    
    // Test hash operations
    console.log('Testing hash operations...');
    await redis.hset('test_hash', 'field1', 'value1');
    await redis.hset('test_hash', 'field2', 'value2');
    const hashValue = await redis.hget('test_hash', 'field1');
    console.log(`Hash value: ${hashValue} (expected: value1)`);
    
    // Clean up
    console.log('Cleaning up test keys...');
    await redis.del('test_key', 'test_list', 'test_hash');
    
    console.log('Redis Cloud connection test completed successfully');
    
    // Quit the client to close the connection gracefully
    console.log('Disconnecting from Redis...');
    await redis.quit();
    console.log('Disconnected from Redis');
    
    // Explicitly exit the process to avoid hanging
    process.exit(0);
  } catch (error) {
    console.error('Error testing Redis Cloud connection:', error);
    // Try to disconnect if redis exists
    if (redis) {
      try {
        await redis.quit();
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
    process.exit(1);
  }
}

// Execute the test
testRedisConnection();