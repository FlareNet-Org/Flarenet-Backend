const Redis = require('ioredis');
const { promisify } = require('util');
const path = require('path');
const dotenv = require('dotenv');

// Explicitly load Redis Cloud environment variables first, then fall back to default .env
const redisCloudPath = path.resolve(__dirname, '..', '.env.redis-cloud');
const defaultEnvPath = path.resolve(__dirname, '..', '.env');

// Load Redis Cloud config with higher priority and override existing values
dotenv.config({ path: redisCloudPath, override: true });
dotenv.config({ path: defaultEnvPath });

console.log('Redis environment loaded from:', redisCloudPath);
console.log('Redis URL from env:', process.env.REDIS_URL ? 'YES (defined)' : 'NO (undefined)');

// Redis client variables
let redisClient;
let redisEnabled = process.env.REDIS_ENABLED !== 'false'; // Default to enabled unless explicitly disabled
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

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
    
    connectionAttempts++;
    console.log(`Redis connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
    
    // Log the Redis configuration for debugging
    console.log('Redis configuration:');
    console.log(`- Using URL: ${!!process.env.REDIS_URL}`);
    console.log(`- Host: ${process.env.REDIS_HOST || 'localhost'}`);
    console.log(`- Port: ${process.env.REDIS_PORT || '6379'}`);
    console.log(`- TLS Enabled: ${process.env.REDIS_USE_TLS === 'true'}`);
    console.log(`- Redis Enabled: ${redisEnabled}`);
    
    // Check if we have a Redis URL (preferred for cloud services)
    if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('your-redis-host')) {
      console.log('Connecting to Redis using connection URL from Redis Cloud');
      console.log(`URL format: ${process.env.REDIS_URL.split('@')[0].replace(/:[^:]*@/, ':****@')}@[REDACTED]`);
      
      // Configure connection options for Redis Cloud
      const connectionOptions = {
        maxRetriesPerRequest: null, // BullMQ requires this to be null
        enableReadyCheck: true,
        enableOfflineQueue: true,
        reconnectOnError: (err) => {
          console.log(`Redis reconnect triggered due to error: ${err.message}`);
          const targetError = 'READONLY';
          return err.message.includes(targetError) || err.message.includes('ETIMEDOUT');
        },
        retryStrategy: (times) => {
          // Only use retry strategy from env if explicitly enabled
          if (process.env.REDIS_RETRY_STRATEGY !== 'true') {
            return null; // No retry if not enabled
          }
          
          const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '10', 10);
          const delay = Math.min(times * 500, 10000); // Longer delays with higher ceiling
          console.log(`Redis retry strategy: attempt ${times}/${maxRetries}, delaying ${delay}ms`);
          if (times > maxRetries) {
            console.log(`Redis connection failed after ${maxRetries} retries, will stop retrying`);
            return null; // Stop retrying after max attempts
          }
          return delay;
        },
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '30000', 10), // Default 30 seconds timeout
        disconnectTimeout: 5000, // 5 seconds disconnect timeout
        keepAlive: process.env.REDIS_KEEP_ALIVE === 'true' ? 10000 : 0 // Enable keepAlive if configured
      };
      
      // Add TLS options if TLS is enabled
      if (process.env.REDIS_USE_TLS === 'true') {
        console.log('Configuring Redis with TLS options');
        connectionOptions.tls = {
          rejectUnauthorized: false // Less strict for testing environments
        };
      }
      
      return new Redis(process.env.REDIS_URL, connectionOptions);
    }
    
    // Fallback to individual connection parameters
    console.log('WARNING: No valid Redis URL found, falling back to individual parameters');
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // BullMQ requires this to be null
      enableReadyCheck: true,
      enableOfflineQueue: true,
      reconnectOnError: (err) => {
        console.log(`Redis reconnect triggered due to error: ${err.message}`);
        const targetError = 'READONLY';
        return err.message.includes(targetError) || err.message.includes('ETIMEDOUT');
      },
      retryStrategy: (times) => {
        // Only use retry strategy from env if explicitly enabled
        if (process.env.REDIS_RETRY_STRATEGY !== 'true') {
          return null; // No retry if not enabled
        }
        
        const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '10', 10);
        const delay = Math.min(times * 500, 10000); // Longer delays with higher ceiling
        console.log(`Redis retry strategy: attempt ${times}/${maxRetries}, delaying ${delay}ms`);
        if (times > maxRetries) {
          console.log(`Redis connection failed after ${maxRetries} retries, will stop retrying`);
          return null; // Stop retrying after max attempts
        }
        return delay;
      },
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '30000', 10),
      disconnectTimeout: 5000, 
      keepAlive: process.env.REDIS_KEEP_ALIVE === 'true' ? 10000 : 0,
      tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined
    };

    console.log('Creating new Redis client with configuration');
    const client = new Redis(redisConfig);
    
    // Handle connection events
    client.on('error', (error) => {
      console.error('Redis connection error:', error);
      // Don't disable Redis on every error, just log it
      if (error.code === 'ECONNREFUSED') {
        console.log('Connection to Redis refused. Check if Redis server is running.');
        // Only disable if we've exceeded max connection attempts
        if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
          console.log(`Max connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached, disabling Redis`);
          redisEnabled = false;
        }
      } else if (error.code === 'ETIMEDOUT') {
        console.log('Connection to Redis timed out. Check network connectivity to Redis server.');
        // Don't disable Redis on timeout, retry might succeed
        console.log(`Connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
      } else {
        console.log(`Redis error: ${error.message}`);
      }
    });
    
    client.on('connect', () => {
      console.log('Connected to Redis server');
      redisEnabled = true;
    });
    
    client.on('ready', () => {
      console.log('Redis Client Ready');
      redisEnabled = true;
      // Reset connection attempts on successful connection
      connectionAttempts = 0;
      // Emit a ready event that can be listened to by other modules
      client.emit('redis_ready', true);
    });
    
    client.on('reconnecting', (delay) => {
      console.log(`Redis reconnecting in ${delay}ms...`);
    });
    
    client.on('end', () => {
      console.log('Redis connection ended');
    });
    
    // Handle close events
    client.on('close', () => {
      console.log('Redis connection closed');
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