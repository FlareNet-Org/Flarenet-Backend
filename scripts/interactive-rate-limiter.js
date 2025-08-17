const readline = require('readline');
const axios = require('axios');
const colors = require('colors/safe');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_URL = 'http://localhost:5000/api/llm/chat';
const API_KEY = 'test-api-key'; // Change as needed
const TEST_USER_ID = 'rate-limit-test-user'; // Consistent user ID for rate limit testing

// Store results
let results = [];
let currentPlan = 'free';
let requestCount = 0;
let autoMode = false;
let autoInterval = null;

// Print header
console.log(colors.cyan('\n==================================='));
console.log(colors.cyan('    RATE LIMITER TESTING TOOL     '));
console.log(colors.cyan('===================================\n'));

// Display menu
function showMenu() {
  console.log(colors.yellow('\nCURRENT SETTINGS:'));
  console.log(`Plan: ${colors.green(currentPlan)}`);
  console.log(`Requests made: ${colors.green(requestCount)}`);
  console.log(`Auto mode: ${colors.green(autoMode ? 'ON' : 'OFF')}`);
  
  console.log(colors.yellow('\nCOMMANDS:'));
  console.log(colors.white('s - Send single request'));
  console.log(colors.white('p <plan> - Change plan (free, pro, enterprise)'));
  console.log(colors.white('a <count> <delay> - Auto mode (send <count> requests with <delay>ms between)'));
  console.log(colors.white('x - Stop auto mode'));
  console.log(colors.white('c - Clear results'));
  console.log(colors.white('r - Show results summary'));
  console.log(colors.white('q - Quit'));
  
  promptUser();
}

// Prompt for input
function promptUser() {
  rl.question(colors.green('\n> '), handleCommand);
}

// Handle user commands
function handleCommand(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  
  switch(command) {
    case 's':
      sendRequest().then(() => showMenu());
      break;
      
    case 'p':
      if (parts.length < 2) {
        console.log(colors.red('Please specify a plan (free, pro, enterprise)'));
        showMenu();
        break;
      }
      const newPlan = parts[1].toLowerCase();
      if (['free', 'pro', 'enterprise'].includes(newPlan)) {
        currentPlan = newPlan;
        console.log(colors.green(`Plan changed to ${newPlan}`));
      } else {
        console.log(colors.red('Invalid plan. Use free, pro, or enterprise'));
      }
      showMenu();
      break;
      
    case 'a':
      if (parts.length < 3) {
        console.log(colors.red('Please specify count and delay (a <count> <delay>)'));
        showMenu();
        break;
      }
      const count = parseInt(parts[1]);
      const delay = parseInt(parts[2]);
      if (isNaN(count) || isNaN(delay) || count < 1 || delay < 100) {
        console.log(colors.red('Invalid count or delay. Count must be > 0, delay must be >= 100ms'));
        showMenu();
        break;
      }
      startAutoMode(count, delay);
      break;
      
    case 'x':
      stopAutoMode();
      showMenu();
      break;
      
    case 'c':
      results = [];
      requestCount = 0;
      console.log(colors.green('Results cleared'));
      showMenu();
      break;
      
    case 'r':
      showResults();
      showMenu();
      break;
      
    case 'q':
      stopAutoMode();
      console.log(colors.cyan('\nGoodbye!\n'));
      rl.close();
      process.exit(0);
      break;
      
    default:
      console.log(colors.red('Unknown command'));
      showMenu();
  }
}

// Send a single request
async function sendRequest() {
  requestCount++;
  const reqNumber = requestCount;
  
  try {
    console.log(colors.yellow(`[${new Date().toLocaleTimeString()}] Sending request #${reqNumber} (${currentPlan} plan)...`));
    
    const startTime = Date.now();
    const response = await axios.post(API_URL, 
      { 
        message: `Test message ${reqNumber}`,
        userId: TEST_USER_ID,  // Use consistent user ID
        plan: currentPlan
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Accept all status codes
      }
    );
    const duration = Date.now() - startTime;
    
    const result = {
      requestNumber: reqNumber,
      plan: currentPlan,
      status: response.status,
      time: new Date().toLocaleTimeString(),
      duration: duration,
      success: response.status < 400
    };
    
    // Add rate limit info if available
    if (response.headers['x-ratelimit-remaining']) {
      result.remaining = response.headers['x-ratelimit-remaining'];
      result.limit = response.headers['x-ratelimit-limit'];
    }
    
    // Add error details if failed
    if (!result.success && response.data) {
      result.error = response.data.error;
      result.retryAfter = response.data.retryAfter;
    }
    
    results.push(result);
    
    if (result.success) {
      console.log(colors.green(`✅ Request #${reqNumber} succeeded (${result.status}) in ${duration}ms`));
      console.log(colors.green(`   Remaining: ${result.remaining}/${result.limit}`));
    } else {
      console.log(colors.red(`❌ Request #${reqNumber} failed (${result.status}) in ${duration}ms`));
      console.log(colors.red(`   Error: ${result.error}, Retry after: ${result.retryAfter}s`));
    }
    
    return result;
  } catch (error) {
    console.error(colors.red(`⚠️ Request #${reqNumber} error: ${error.message}`));
    results.push({
      requestNumber: reqNumber,
      plan: currentPlan,
      time: new Date().toLocaleTimeString(),
      error: error.message,
      success: false
    });
    return null;
  }
}

// Start auto mode
function startAutoMode(count, delay) {
  if (autoMode) {
    stopAutoMode();
  }
  
  autoMode = true;
  let remaining = count;
  
  console.log(colors.cyan(`Starting auto mode: ${count} requests with ${delay}ms delay`));
  
  function sendNext() {
    if (remaining <= 0 || !autoMode) {
      stopAutoMode();
      showMenu();
      return;
    }
    
    sendRequest().then(() => {
      remaining--;
      if (remaining > 0) {
        console.log(colors.yellow(`${remaining} requests remaining...`));
      }
    });
  }
  
  // Send first request immediately
  sendNext();
  
  // Schedule remaining requests
  autoInterval = setInterval(() => {
    sendNext();
  }, delay);
}

// Stop auto mode
function stopAutoMode() {
  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
  }
  autoMode = false;
  console.log(colors.yellow('Auto mode stopped'));
}

// Show results summary
function showResults() {
  if (results.length === 0) {
    console.log(colors.yellow('No results to display'));
    return;
  }
  
  console.log(colors.cyan('\n===== RESULTS SUMMARY ====='));
  
  // Group by plan
  const byPlan = {};
  results.forEach(r => {
    if (!byPlan[r.plan]) byPlan[r.plan] = { total: 0, success: 0, failed: 0 };
    byPlan[r.plan].total++;
    if (r.success) byPlan[r.plan].success++;
    else byPlan[r.plan].failed++;
  });
  
  // Print plan summaries
  Object.keys(byPlan).forEach(plan => {
    const stats = byPlan[plan];
    console.log(colors.yellow(`\n${plan.toUpperCase()} PLAN:`));
    console.log(`Total requests: ${colors.white(stats.total)}`);
    console.log(`Successful: ${colors.green(stats.success)}`);
    console.log(`Failed: ${colors.red(stats.failed)}`);
    console.log(`Success rate: ${colors.cyan(((stats.success / stats.total) * 100).toFixed(2) + '%')}`);
  });
  
  console.log(colors.cyan('\n===========================\n'));
}

// Start the application
showMenu();
