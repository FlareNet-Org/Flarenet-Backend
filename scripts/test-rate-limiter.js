const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000/api/llm/chat';
const API_KEY = 'test-api-key'; // Replace with your test API key if needed
const REQUEST_COUNT = 15; // Number of requests to send
const INTERVAL = 500; // Time between requests in ms
const USER_PLANS = ['free', 'pro', 'enterprise']; // Test different user plans
const TEST_USER_ID = 'rate-limit-test-user'; // Consistent user ID for rate limit testing

// Function to send a single request
async function sendRequest(index, plan) {
  try {
    console.time(`Request ${index}`);
    const response = await axios.post(API_URL, 
      { 
        message: `Test message ${index}`,
        userId: TEST_USER_ID,  // Use consistent user ID
        plan: plan
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.timeEnd(`Request ${index}`);
    return {
      status: response.status,
      remaining: response.headers['x-ratelimit-remaining'],
      limit: response.headers['x-ratelimit-limit'],
      plan: plan,
      success: true
    };
  } catch (error) {
    console.timeEnd(`Request ${index}`);
    if (error.response) {
      return {
        status: error.response.status,
        retryAfter: error.response.data.retryAfter,
        error: error.response.data.error,
        plan: plan,
        success: false
      };
    } else {
      console.error(`Request ${index} failed:`, error.message);
      return {
        error: error.message,
        plan: plan,
        success: false
      };
    }
  }
}

// Function to test a specific plan
async function testPlan(plan) {
  console.log(`\n=== Testing '${plan}' plan ===\n`);
  const results = [];
  
  for (let i = 1; i <= REQUEST_COUNT; i++) {
    const result = await sendRequest(i, plan);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Request ${i} succeeded (${result.status}). Remaining: ${result.remaining}/${result.limit}`);
    } else {
      console.log(`❌ Request ${i} failed (${result.status}). Retry after: ${result.retryAfter}s. Error: ${result.error}`);
    }
    
    // Add a delay between requests to see rate limiting in action
    if (i < REQUEST_COUNT) {
      await new Promise(resolve => setTimeout(resolve, INTERVAL));
    }
  }
  
  return results;
}

// Run the test for each plan sequentially
async function runTests() {
  console.log(`\n🚀 Starting rate limiter tests (${REQUEST_COUNT} requests per plan)...\n`);
  
  for (const plan of USER_PLANS) {
    await testPlan(plan);
    // Wait a bit longer between plan tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✨ Rate limiter tests completed!\n');
}

runTests().catch(err => console.error('Test error:', err));
