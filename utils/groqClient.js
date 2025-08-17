/**
 * Example of using the rate limit handler with Groq API
 */

const { withRateLimitRetry } = require('../utils/rateLimitHandler');
const Groq = require('groq-sdk');

// This is just an example - replace with your actual LLM service integration
async function callGroqWithRateLimitHandling(prompt, options = {}) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  // Use the retry wrapper
  return withRateLimitRetry(
    async () => {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: options.model || 'qwen/qwen3-32b'
      });
      
      return completion.choices[0].message.content;
    },
    {
      // Customize retry behavior
      maxRetries: 5,
      baseDelayMs: 1000,
      useExponentialBackoff: true,
      onRetry: ({ attempt, delayMs }) => {
        console.log(`Rate limited by Groq API. Retry attempt ${attempt} in ${delayMs / 1000}s...`);
      }
    }
  );
}

// Example usage (for demonstration only):
/*
async function example() {
  try {
    const response = await callGroqWithRateLimitHandling("What is the capital of France?");
    console.log("Response:", response);
  } catch (error) {
    console.error("Failed after all retries:", error);
  }
}
*/

module.exports = {
  callGroqWithRateLimitHandling
};
