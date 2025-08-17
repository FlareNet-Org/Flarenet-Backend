/**
 * Groq API Rate Limit Handler
 * 
 * This file implements utility functions to handle rate limiting
 * with the Groq API more gracefully.
 */

const { setTimeout } = require('timers/promises');

/**
 * Wrapper for Groq API calls that handles rate limiting
 * @param {Function} apiCallFn - Function that makes the API call
 * @param {Object} options - Options for retry behavior
 * @returns {Promise} - Result of the API call
 */
async function withRateLimitRetry(apiCallFn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    useExponentialBackoff = true,
    onRetry = null,
  } = options;
  
  let attempt = 0;
  
  while (true) {
    try {
      return await apiCallFn();
    } catch (error) {
      attempt++;
      
      // Check if it's a rate limit error (429)
      const isRateLimit = error.status === 429 || 
                         (error.response && error.response.status === 429) ||
                         error.message.includes('rate limit');
      
      // Stop retrying if max attempts reached or not a rate limit error
      if (attempt > maxRetries || !isRateLimit) {
        throw error;
      }
      
      // Calculate delay (exponential backoff or linear)
      const delayMs = useExponentialBackoff
        ? baseDelayMs * Math.pow(2, attempt - 1) // Exponential: 1s, 2s, 4s, 8s...
        : baseDelayMs * attempt; // Linear: 1s, 2s, 3s, 4s...
      
      // Get retry-after header if available
      let retryAfterMs = delayMs;
      if (error.response && error.response.headers && error.response.headers['retry-after']) {
        // Retry-After is in seconds, convert to milliseconds
        retryAfterMs = parseInt(error.response.headers['retry-after'], 10) * 1000;
      } else if (error.headers && error.headers['retry-after']) {
        retryAfterMs = parseInt(error.headers['retry-after'], 10) * 1000;
      }
      
      // Use the larger of our calculated delay or the server's retry-after
      const finalDelayMs = Math.max(delayMs, retryAfterMs);
      
      // Call the onRetry callback if provided
      if (onRetry) {
        onRetry({
          error,
          attempt,
          delayMs: finalDelayMs,
          willRetry: true
        });
      }
      
      // Wait before retrying
      await setTimeout(finalDelayMs);
    }
  }
}

module.exports = {
  withRateLimitRetry
};
