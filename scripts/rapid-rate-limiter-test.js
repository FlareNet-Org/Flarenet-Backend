const axios = require('axios');

// Configuration
const TEST_API_KEY = 'test-api-key'; // Same API key as in the burst test
const API_URL = 'http://localhost:5000/api/llm/chat';
const REQUESTS = 15; // Number of requests to make in quick succession

/**
 * Simple function to clear the rate limiter bucket
 */
async function clearRateLimitBucket() {
  try {
    const Redis = require('ioredis');
    const redis = new Redis();
    await redis.del(`ratelimit:${TEST_API_KEY}`);
    console.log('✅ Successfully cleared rate limit bucket');
    await redis.quit();
  } catch (error) {
    console.error(`❌ Failed to clear rate limit bucket: ${error.message}`);
  }
}

/**
 * Send requests in rapid succession
 */
async function sendRapidRequests(plan) {
  console.log(`\n🔥 Testing ${plan.toUpperCase()} plan with ${REQUESTS} rapid requests\n`);
  
  const promises = [];
  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0,
  };
  
  // Send all requests almost simultaneously
  for (let i = 1; i <= REQUESTS; i++) {
    const promise = axios.post(
      API_URL,
      {
        message: `Simple test ${i}`,
        userId: 'rapid-test-user',
        plan: plan
      },
      {
        headers: {
          'x-api-key': TEST_API_KEY,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Accept any status code
      }
    ).then(response => {
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];
      
      if (response.status === 429) {
        results.rateLimited++;
        console.log(`❌ Request ${i} rate limited (429) - Retry after: ${response.data.retryAfter}s`);
      } else if (response.status >= 200 && response.status < 300) {
        results.success++;
        console.log(`✅ Request ${i} succeeded (${response.status}) - Remaining: ${remaining}/${limit}`);
      } else {
        results.errors++;
        console.log(`⚠️ Request ${i} error: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      
      return {
        id: i,
        status: response.status,
        remaining,
        limit
      };
    }).catch(error => {
      results.errors++;
      console.error(`⚠️ Request ${i} exception: ${error.message}`);
      return {
        id: i,
        error: error.message
      };
    });
    
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  await Promise.all(promises);
  
  // Show results
  console.log('\n📊 RESULTS:');
  console.log(`✅ Successful: ${results.success}/${REQUESTS}`);
  console.log(`❌ Rate limited: ${results.rateLimited}/${REQUESTS}`);
  console.log(`⚠️ Other errors: ${results.errors}/${REQUESTS}`);
  
  return results;
}

/**
 * Run tests for all plans
 */
async function runTests() {
  const plans = ['free', 'pro', 'enterprise'];
  
  console.log('🧪 RATE LIMITER RAPID TEST');
  console.log('========================\n');
  
  for (const plan of plans) {
    // Clear rate limit bucket before each test
    await clearRateLimitBucket();
    await sendRapidRequests(plan);
    
    // Add delay between tests
    if (plan !== plans[plans.length - 1]) {
      console.log('\nWaiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n✨ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
