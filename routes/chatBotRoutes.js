const express = require("express");
const { chatbotController } = require("../utils/features/chatBotController");
const router = express.Router();
const createRateLimiter = require("../middlewares/tokenBucketLimiter");


// Rate limiter configuration for chat endpoint

const chatRateLimiter = createRateLimiter({
    defaultBucketSize: 5,        // Smaller bucket for easier testing
    defaultRefillRate: 0.1,      // 1 token per 10 seconds
    keyGenerator: (req) => {
        // Use API key if available, otherwise normalize IP
        return req.headers['x-api-key'] || 
               (req.ip.startsWith('::ffff:') ? req.ip.substring(7) : req.ip);
    },
    planLimiter: (req) => {
        // Example: Different limits based on user plan
        const userPlan = req.user?.plan || 'free';
        const limits = {
            free: { bucketSize: 5, refillRate: 0.1 },     // 5 requests, refills 1 per 10 sec
            pro: { bucketSize: 30, refillRate: 0.5 },     // 30 requests, refills 1 per 2 sec
            enterprise: { bucketSize: 60, refillRate: 1 } // 60 requests, refills 1 per sec
        };
        return limits[userPlan] || limits.free;
    },
    failOpen: false // Don't allow requests if Redis is down - better for testing
});

router.post("/chat", chatRateLimiter, chatbotController);

module.exports = router;