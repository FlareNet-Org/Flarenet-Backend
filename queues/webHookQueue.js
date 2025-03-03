const { Queue } = require('bullmq');
require('dotenv').config({ path: '../.env' });
const webHookQueue = new Queue('webHookQueue', {
    connection: {
        url: process.env.REDIS_HOST, // Use environment variable or fallback
    }
});

module.exports = webHookQueue;