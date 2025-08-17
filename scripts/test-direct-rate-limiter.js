/**
 * Direct Rate Limiter Test
 * 
 * This script directly tests the token bucket rate limiter implementation
 * without making actual API calls to external services.
 */

const createRateLimiter = require('../middlewares/tokenBucketLimiter');
const { getRedisClient } = require('../utils/redisClient');
const { TokenBucketLimiter } = require('../middlewares/tokenBucketLimiter');

// Configuration
const TEST_USER_ID = 'test-user-direct';
const TEST_API_KEY = 'test-api-key-direct';

// Create test express request and response objects
function createMockReq(userId, plan = 'free') {
  return {
    body: { userId, plan },
    headers: { 'x-api-key': TEST_API_KEY },
    ip: '127.0.0.1',
    path: '/test-endpoint'
  };
}

function createMockRes() {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    },
    setHeader: function(key, value) {
      if (!this.headers) this.headers = {};
      this.headers[key] = value;
    },
    statusCode: 200,
    data: null,
    headers: {}
  };
  return res;
}

// Clear the rate limit buckets in Redis
async function clearRateLimitBuckets() {
  try {
    const redis = await getRedisClient();
    console.log('Clearing rate limit buckets...');
    await redis.del(`ratelimit:${TEST_API_KEY}`);
    await redis.del(`ratelimit:${TEST_USER_ID}`);
    console.log('✅ Rate limit buckets cleared');
  } catch (error) {
    console.error('❌ Failed to clear rate limit buckets:', error);
  }
}

// Function to test rate limiting directly
async function testRateLimiter(planName, requestCount) {
  console.log(`\n🔥 Testing ${planName.toUpperCase()} plan with ${requestCount} requests`);
  console.log('-'.repeat(60));

  // Create a rate limiter instance matching your actual configuration
  const rateLimiter = createRateLimiter({
    defaultBucketSize: 10,
    defaultRefillRate: 0.1,
    keyGenerator: (req) => {
      return req.headers['x-api-key'];
    },
    planLimiter: (req) => {
      const userPlan = req.body?.plan || 'free';
      const limits = {
        free: { bucketSize: 10, refillRate: 0.1 },
        pro: { bucketSize: 30, refillRate: 0.5 },
        enterprise: { bucketSize: 60, refillRate: 1 }
      };
      return limits[userPlan] || limits.free;
    },
    failOpen: false
  });

  // Make multiple requests and track results
  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0
  };

  for (let i = 1; i <= requestCount; i++) {
    const req = createMockReq(TEST_USER_ID, planName);
    const res = createMockRes();
    
    try {
      // Use a promise to handle the async middleware
      await new Promise((resolve) => {
        rateLimiter(req, res, () => {
          resolve();
        });
      });
      
      // Check if rate limited
      if (res.statusCode === 429) {
        results.rateLimited++;
        console.log(`⛔ Request ${i} rate limited - Remaining: ${res.headers['x-ratelimit-remaining']}/${res.headers['x-ratelimit-limit']}`);
      } else {
        results.success++;
        console.log(`✅ Request ${i} allowed - Remaining: ${res.headers['x-ratelimit-remaining']}/${res.headers['x-ratelimit-limit']}`);
      }
    } catch (error) {
      results.errors++;
      console.error(`❌ Request ${i} error:`, error.message);
    }
    
    // Small delay between requests for readability
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\nResults:');
  console.log(`Total requests: ${requestCount}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Rate limited: ${results.rateLimited}`);
  console.log(`Errors: ${results.errors}`);
}

// Main function
async function runTests() {
  console.log(`
╔════════════════════════════════════════╗
║   DIRECT TOKEN BUCKET LIMITER TEST      ║
╚════════════════════════════════════════╝
  `);

  // Clear buckets before testing
  await clearRateLimitBuckets();

  // Test free plan (10 tokens)
  await testRateLimiter('free', 15);
  
  // Wait a bit before testing the next plan
  await new Promise(resolve => setTimeout(resolve, 1000));
  await clearRateLimitBuckets();
  
  // Test pro plan (30 tokens)
  await testRateLimiter('pro', 40);
  
  // Wait a bit before testing the next plan
  await new Promise(resolve => setTimeout(resolve, 1000));
  await clearRateLimitBuckets();
  
  // Test enterprise plan (60 tokens)
  await testRateLimiter('enterprise', 70);
  
  // Close Redis connection when done
  const redis = await getRedisClient();
  await redis.quit();
  console.log('\n✅ Tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
