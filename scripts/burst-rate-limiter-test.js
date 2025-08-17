const axios = require('axios');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const os = require('os');

// Configuration
const API_URL = 'http://localhost:5000/api/llm/chat';
const API_KEY = 'test-api-key';
const TEST_USER_ID = 'rate-limit-test-user';

// Test parameters
const BURST_SIZE = 30;  // Number of simultaneous requests in a burst - increased to exceed free tier limit
const THREAD_COUNT = Math.min(BURST_SIZE, os.cpus().length);  // Use available CPUs, max one per request
const PLANS = ['free', 'pro', 'enterprise'];

// Function to attempt clearing the Redis rate limit bucket
async function clearRateLimitBucket(key) {
  try {
    const Redis = require('ioredis');
    const redis = new Redis();
    console.log(`Attempting to clear rate limit bucket for key: ratelimit:${key}`);
    await redis.del(`ratelimit:${key}`);
    console.log(`✅ Successfully cleared rate limit bucket`);
    await redis.quit();
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear rate limit bucket: ${error.message}`);
    return false;
  }
}

// If this is a worker thread, execute the worker function
if (!isMainThread) {
  // Worker code - send a request and report back results
  const { requestId, plan, userId } = workerData;
  
  sendRequest(requestId, plan, userId)
    .then(result => {
      parentPort.postMessage({ requestId, result });
    })
    .catch(error => {
      parentPort.postMessage({ 
        requestId, 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    });
} else {
  // Main thread code
  console.log(`
╔════════════════════════════════════════╗
║   TOKEN BUCKET RATE LIMITER BURST TEST  ║
╚════════════════════════════════════════╝
  `);

  console.log(`🚀 Starting test with ${BURST_SIZE} simultaneous requests per plan`);
  console.log(`🧵 Using ${THREAD_COUNT} worker threads`);
  console.log(`📊 Testing plans: ${PLANS.join(', ')}\n`);

  // Run tests for each plan sequentially
  (async function runTests() {
    // Clear the rate limit bucket for our test API key before starting
    await clearRateLimitBucket(API_KEY);
    
    for (const plan of PLANS) {
      console.log(`\nPreparing to test ${plan.toUpperCase()} plan...`);
      // Clear rate limit bucket before each plan test
      await clearRateLimitBucket(API_KEY);
      await testPlanWithBurst(plan);
      // Wait between plans to let rate limits reset
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(`\n✅ All tests completed!`);
  })();
}

/**
 * Test a specific plan with a burst of simultaneous requests
 */
async function testPlanWithBurst(plan) {
  return new Promise((resolveTest) => {
    console.log(`\n🔥 TESTING BURST: ${plan.toUpperCase()} PLAN (${BURST_SIZE} simultaneous requests)`);
    console.log(`${'='.repeat(70)}`);
    
    const results = new Map();
    const workers = new Map();
    let completedCount = 0;
    
    // Start a timer to measure the total burst time
    console.time(`${plan} burst completed`);
    
    // Function to create a worker for a specific request
    function createWorker(requestId) {
      const worker = new Worker(__filename, {
        workerData: { 
          requestId, 
          plan,
          userId: TEST_USER_ID
        }
      });
      
      worker.on('message', (message) => {
        completedCount++;
        results.set(message.requestId, message.result || message);
        
        // Clean up the worker
        workers.get(message.requestId).terminate();
        workers.delete(message.requestId);
        
        // Log progress
        const percentComplete = Math.round((completedCount / BURST_SIZE) * 100);
        process.stdout.write(`\rProgress: ${percentComplete}% (${completedCount}/${BURST_SIZE})`);
        
        // If all requests are completed, display results
        if (completedCount === BURST_SIZE) {
          console.timeEnd(`${plan} burst completed`);
          displayResults(results, plan);
          resolveTest();
        }
      });
      
      worker.on('error', (err) => {
        console.error(`Worker error for request #${requestId}:`, err);
        completedCount++;
        results.set(requestId, { error: err.message });
        
        // If all requests are completed, display results
        if (completedCount === BURST_SIZE) {
          console.timeEnd(`${plan} burst completed`);
          displayResults(results, plan);
          resolveTest();
        }
      });
      
      return worker;
    }
    
    // Launch workers with throttling based on THREAD_COUNT
    let activeWorkers = 0;
    let nextRequestId = 1;
    
    function launchNextWorker() {
      if (nextRequestId <= BURST_SIZE && activeWorkers < THREAD_COUNT) {
        const requestId = nextRequestId++;
        const worker = createWorker(requestId);
        workers.set(requestId, worker);
        activeWorkers++;
        
        // Schedule next worker launch
        setImmediate(launchNextWorker);
      }
    }
    
    // Start launching workers
    for (let i = 0; i < THREAD_COUNT; i++) {
      launchNextWorker();
    }
  });
}

/**
 * Display the results of a burst test
 */
function displayResults(results, plan) {
  console.log('\n\nRESULTS SUMMARY:');
  console.log('-'.repeat(50));
  
  // Count successes and failures
  let successCount = 0;
  let failCount = 0;
  let rateLimitCount = 0;
  
  // Track rate limit info
  const rateLimits = new Map();
  
  for (const [requestId, result] of results) {
    if (!result.status && result.error) {
      failCount++;
    } else if (result.status === 429) {
      rateLimitCount++;
      rateLimits.set(requestId, {
        retryAfter: result.data?.retryAfter || 'unknown',
      });
    } else if (result.status >= 200 && result.status < 300) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // Calculate percentages
  const total = results.size;
  const successPercent = ((successCount / total) * 100).toFixed(1);
  const rateLimitPercent = ((rateLimitCount / total) * 100).toFixed(1);
  const failPercent = ((failCount / total) * 100).toFixed(1);
  
  console.log(`Plan: ${plan.toUpperCase()}`);
  console.log(`Total requests: ${total}`);
  console.log(`Successful: ${successCount} (${successPercent}%)`);
  console.log(`Rate limited: ${rateLimitCount} (${rateLimitPercent}%)`);
  console.log(`Other failures: ${failCount} (${failPercent}%)`);
  
  // Show sample of rate limited requests
  if (rateLimitCount > 0) {
    console.log('\nSample rate limit responses:');
    let count = 0;
    for (const [requestId, info] of rateLimits) {
      console.log(`  Request #${requestId}: Retry after ${info.retryAfter}s`);
      count++;
      if (count >= 5) break; // Show at most 5 examples
    }
    if (rateLimits.size > 5) {
      console.log(`  ... and ${rateLimits.size - 5} more`);
    }
  }
  
  console.log('-'.repeat(50));
}

/**
 * Send a single request to the API
 */
async function sendRequest(requestId, plan, userId) {
  const response = await axios.post(API_URL, 
    { 
      message: `Burst test message ${requestId}`,
      userId: userId,
      plan: plan
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Accept any status code
    }
  );
  
  return {
    status: response.status,
    data: response.data,
    headers: {
      remaining: response.headers['x-ratelimit-remaining'],
      limit: response.headers['x-ratelimit-limit']
    }
  };
}
