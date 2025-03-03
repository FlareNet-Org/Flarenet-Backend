const { Queue } = require('bullmq');
require('dotenv').config({ path: '../.env' });
const buildQueue = new Queue('buildQueue', {
    connection: {
        url: process.env.REDIS_HOST, // Use environment variable or fallback
    }
});

module.exports = buildQueue;