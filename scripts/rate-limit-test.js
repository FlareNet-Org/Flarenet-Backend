/**
 Rate limit testing script for flareNet backend **/

const axios = require('axios');
const colors = require('colors');

// Terminal colors
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`
};

// Configuration
const API_URL = 'http://localhost:3000/chat';
const TEST_ITERATIONS = 10;
const DELAY_BETWEEN_TESTS = 2000; // milliseconds

//function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//make api requests with specific plans
async function testPlan(plan, apiKey, expectedLimit, description) {
    console.log(colors.blue('\n======================================'));
    console.log(colors.blue(`Testing rate limiting for ${colors.yellow(plan)} plan`));
    console.log(colors.blue(description));
    console.log(colors.blue(`Expected limit: ${colors.yellow(expectedLimit)} requests`));
    console.log(colors.blue('======================================\n'));

    //counter for successful and failed requests
    let success = 0;
    let failed = 0;

    //make multiple requests to test rate limiting
    for (let i = 1; i <= TEST_ITERATIONS; i++) {
        console.log(colors.blue(`Request ${i}/${TEST_ITERATIONS}`));

        try {

        }
        catch (error) {
            if (error.response && error.response.status === 429) {
                const retryAfter = error.response.data.retryAfter || 'some';
                console.log(colors.red(`Rate limited! Retry after: ${retryAfter} seconds`));
                failed++;

                if (error.response.headers['x-ratelimit-limit-remaining'] && error.response.headers['x-ratelimit-limit']) {
                    console.log(colors.yellow(`Rate limit status: ${error.response.headers['x-ratelimit-remaining']}/${error.response.headers['x-ratelimit-limit']} remaining`));
                }
            }
            else {
                if (error.response) {
                    console.log(colors.red(`Status: ${error.response.status}`));
                    console.log(colors.red(`Response: ${JSON.stringify(error.response.data)}`));
                }
                failed++;
            }


        }
        await sleep(500);
    }
    console.log(colors.blue(`\nTest Summary for ${plan} plan:`));
    console.log(colors.green(`Successful requests: ${success}`));
    console.log(colors.red(`Rate limited requests: ${failed}`));
    console.log(colors.blue('======================================\n'));

    // Wait between tests
    console.log(`Waiting ${DELAY_BETWEEN_TESTS / 1000} seconds before next test...`);
    await sleep(DELAY_BETWEEN_TESTS);

    // Small delay between requests
}

//function to test withour api key
async function testNoApiKey() {

}

//moan execution driver
async function main() {
    try {
        console.log(colors.blue('==========================================='));
        console.log(colors.yellow('Flarenet Backend Rate Limiting Test Suite'));
        console.log(colors.blue('===========================================\n'));

        //start testing with free plan
        await testPlan('free','free-plan-api-key','5','Free plan with 5 requests per minute refils 1 per 10 sec');
    }
    catch (e) {
        console.error('Error running tests:', e.message);
        process.exit(1);
    }
}