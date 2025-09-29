/**
 * Queue Test with Redis Cloud
 * 
 * This script tests that our queues work correctly
 * with the Redis Cloud connection
 */

// Load environment variables from special Redis Cloud env file
require('dotenv').config({ path: '.env.redis-cloud' });

// Import required modules
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

console.log('Testing queues with Redis Cloud connection...');
console.log('Redis URL:', process.env.REDIS_URL);
console.log('TLS Enabled:', process.env.REDIS_USE_TLS);

// Test basic Redis connection first
const testConnection = async () => {
  try {
    console.log('Testing direct Redis connection...');
    
    // Create connection options explicitly - try URL approach first
    let redis;
    
    if (process.env.REDIS_URL) {
      console.log('Attempting connection with REDIS_URL...');
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 15000, // 15 seconds
        retryStrategy: (times) => {
          return Math.min(times * 100, 3000);
        }
      });
    } else {
      console.log('Attempting connection with individual parameters...');
      const redisOptions = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '15621'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        connectTimeout: 15000, // 15 seconds
        retryStrategy: (times) => {
          return Math.min(times * 100, 3000);
        },
        tls: process.env.REDIS_USE_TLS === 'true' ? {
          rejectUnauthorized: false, // Less strict TLS for testing
        } : undefined
      };
      
      redis = new Redis(redisOptions);
    }
    
    // Add event handlers
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    redis.on('connect', () => {
      console.log('Successfully connected to Redis!');
    });
    
    // Try a simple PING command
    console.log('Sending PING command...');
    const pingResult = await redis.ping();
    console.log('Ping result:', pingResult);
    
    // Close connection
    await redis.quit();
    
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return false;
  }
};

// Create queue objects directly instead of importing
const createQueue = (name) => {
  // Use URL or connection object based on what's available
  const connectionConfig = process.env.REDIS_URL 
    ? { url: process.env.REDIS_URL } 
    : {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '15621'),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_USE_TLS === 'true' ? {
          rejectUnauthorized: false // Less strict TLS validation for testing
        } : undefined
      };
      
  // Add common options
  connectionConfig.maxRetriesPerRequest = 3;
  connectionConfig.connectTimeout = 15000; // 15 seconds
  
  console.log(`Creating ${name} queue with ${process.env.REDIS_URL ? 'URL' : 'connection parameters'}`);
  
  return new Queue(name, { connection: connectionConfig });
};

// Function to create a test worker
function createTestWorker(queueName) {
  // Use URL or connection object based on what's available
  const connectionConfig = process.env.REDIS_URL 
    ? { url: process.env.REDIS_URL } 
    : {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '15621'),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_USE_TLS === 'true' ? {
          rejectUnauthorized: false // Less strict TLS validation for testing
        } : undefined
      };
      
  // Add common options
  connectionConfig.maxRetriesPerRequest = 3;
  connectionConfig.connectTimeout = 15000; // 15 seconds
  
  console.log(`Creating ${queueName} worker with ${process.env.REDIS_URL ? 'URL' : 'connection parameters'}`);
  
  return new Worker(
    queueName,
    async (job) => {
      console.log(`Processing job ${job.id} from ${queueName}`);
      console.log(`Job data:`, job.data);
      return { processed: true, queue: queueName, timestamp: new Date().toISOString() };
    },
    {
      connection: connectionConfig
    }
  );
}

// Add test jobs to each queue
async function testQueues() {
  try {
    // First test basic connection
    const connectionSuccess = await testConnection();
    if (!connectionSuccess) {
      console.error('Failed basic connection test, aborting queue tests');
      process.exit(1);
    }
    
    // Create queues
    const buildQueue = createQueue('buildQueue');
    const webHookQueue = createQueue('webHookQueue');
    const failedQueue = createQueue('failedQueue');

    // Create test workers
    const buildWorker = createTestWorker('buildQueue');
    const webHookWorker = createTestWorker('webHookQueue');
    const failedWorker = createTestWorker('failedQueue');

    console.log('Adding test jobs to queues...');

    // Add test job to build queue
    const buildJob = await buildQueue.add('test-build', {
      name: 'Test Build Job',
      timestamp: new Date().toISOString()
    });
    console.log(`Added job ${buildJob.id} to build queue`);

    // Add test job to webhook queue
    const webhookJob = await webHookQueue.add('test-webhook', {
      name: 'Test WebHook Job',
      timestamp: new Date().toISOString()
    });
    console.log(`Added job ${webhookJob.id} to webhook queue`);

    // Add test job to failed queue
    const failedJob = await failedQueue.add('test-failed', {
      name: 'Test Failed Job',
      timestamp: new Date().toISOString()
    });
    console.log(`Added job ${failedJob.id} to failed queue`);

    // Wait for all jobs to complete
    console.log('Waiting for jobs to be processed...');
    
    // Wait for 5 seconds to let the workers process the jobs
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Clean up
    console.log('Cleaning up...');
    await buildWorker.close();
    await webHookWorker.close();
    await failedWorker.close();
    await buildQueue.close();
    await webHookQueue.close();
    await failedQueue.close();
    
    // Wait a moment for connections to fully close
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Exit gracefully
    console.log('Queue test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error testing queues:', error);
    process.exit(1);
  }
}

// Run the tests
testQueues();