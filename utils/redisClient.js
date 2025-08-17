const Redis = require('ioredis');
const { promisify } = require('util');

// Load environment variables
let redisClient;
let redisEnabled = process.env.REDIS_ENABLED !== 'false'; // Default to enabled unless explicitly disabled

/**
 * Initialize Redis client
 * @returns {Object} Redis client instance
 */
const initRedisClient = () => {
  try {
    if (!redisEnabled) {
      console.log('Redis caching is explicitly disabled via environment variable');
      return null;
    }
    
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    };

    const client = new Redis(redisConfig);
    
    client.on('error', (error) => {
      console.error('Redis connection error:', error);
      redisEnabled = false;
    });
    
    client.on('connect', () => {
      console.log('Connected to Redis server');
      redisEnabled = true;
    });
    
    client.on('ready', () => {
      console.log('Redis Client Ready');
      redisEnabled = true;
      // Emit a ready event that can be listened to by other modules
      client.emit('redis_ready', true);
    });
    
    return client;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    redisEnabled = false;
    return null;
  }
};

/**
 * Get Redis client instance (singleton pattern)
 * @returns {Object} Redis client
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = initRedisClient();
    
    // Log whether we got a client
    if (redisClient) {
      console.log('Redis Client Initialized');
    } else {
      console.log('Redis Client Initialization Failed');
    }
  }
  return redisClient;
};

/**
 * Check if Redis is enabled and connected
 * @returns {Boolean} Redis status
 */
const isRedisAvailable = () => {
  // Force initialization if not already done
  if (!redisClient) {
    getRedisClient();
  }
  return redisEnabled && redisClient && redisClient.status === 'ready';
};

module.exports = {
  getRedisClient,
  isRedisAvailable,
  initRedisClient
}; 