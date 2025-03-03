const { Queue } = require('bullmq');
require('dotenv').config({ path: '../.env' });
const failedQueue = new Queue('failedBuildQueue', {
    connection: {
        url: process.env.REDIS_HOST, // Use environment variable or fallback
    }
});

module.exports = failedQueue;