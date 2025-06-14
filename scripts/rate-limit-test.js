/**
 Rate limit testing script for flareNet backend **/

const axios = require('axios');
const colors = require('colors');

// Terminal colors
// const colors = {
//     green: (text) => `\x1b[32m${text}\x1b[0m`,
//     red: (text) => `\x1b[31m${text}\x1b[0m`,
//     yellow: (text) => `\x1b[33m${text}\x1b[0m`,
//     blue: (text) => `\x1b[34m${text}\x1b[0m`
// };

// Configuration
const API_URL = 'http://localhost:5000/api/llm/chat';
const TEST_ITERATIONS = 100;
const DELAY_BETWEEN_TESTS = 2000; // milliseconds

//function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//make api requests with specific plans
async function testPlan(plan, apiKey, expectedLimit, description) {
    // Generate a unique API key to ensure a fresh rate limit bucket
    const uniqueApiKey = `${apiKey}-${Date.now()}`;

    console.log(colors.blue('\n======================================'));
    console.log(colors.blue(`Testing rate limiting for ${colors.yellow(plan)} plan`));
    console.log(colors.blue(description));
    console.log(colors.blue(`Expected limit: ${colors.yellow(expectedLimit)} requests`));
    console.log(colors.blue(`Using API key: ${uniqueApiKey}`));
    console.log(colors.blue('======================================\n'));

    //counter for successful and failed requests
    let success = 0;
    let failed = 0;

    //make multiple requests to test rate limiting
    for (let i = 1; i <= TEST_ITERATIONS; i++) {
        console.log(colors.blue(`Request ${i}/${TEST_ITERATIONS}`));

        try {
            //requestor logic
            const response = await axios.post(API_URL, {
                message: 'hello', 
                userId: 1,
                plan: plan // Include plan in the request body
            },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': uniqueApiKey
                    }

                }
            );
            console.log(colors.green(`Request ${i} successful`));
            success++;

            //get more limit headers if avaliable
            if (response.headers['x-ratelimit-remaining'] && response.headers['x-ratelimit-limit']) {
                console.log(colors.yellow(`Rate limit status: ${response.headers['x-ratelimit-remaining']}/${response.headers['x-ratelimit-limit']} remaining`));
            }

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

//function to test without api key
async function testNoApiKey() {
    console.log(colors.blue('\n======================================'));
    console.log(colors.blue(`Testing rate limiting with ${colors.yellow('no API key')} (IP-based)`));
    console.log(colors.blue('Expected to use free plan limits'));
    console.log(colors.blue('======================================\n'));


    for (let i = 1; i <= TEST_ITERATIONS; i++) {
        console.log(colors.blue(`Request ${i}/${TEST_ITERATIONS}`));

        try {
            // Make request without API key
            await axios.post(API_URL,
                { message: 'hello', userId: 1 },
                { headers: { 'Content-Type': 'application/json' } }
            );

            console.log(colors.green('Request successful'));

        } catch (error) {
            if (error.response && error.response.status === 429) {
                const retryAfter = error.response.data.retryAfter || 'unknown';
                console.log(colors.red(`Rate limited! Retry after: ${retryAfter} seconds`));
            } else {
                console.log(colors.red(`Error: ${error.message}`));
                if (error.response) {
                    console.log(colors.red(`Status: ${error.response.status}`));
                    console.log(colors.red(`Response: ${JSON.stringify(error.response.data)}`));
                }
            }
        }

        // Small delay between requests
        await sleep(500);
    }
}

//moan execution driver
async function main() {
    try {
        console.log(colors.blue('==========================================='));
        console.log(colors.yellow('Flarenet Backend Rate Limiting Test Suite'));
        console.log(colors.blue('===========================================\n'));

        //start testing with free plan
        // await testPlan('free', 'free-plan-api-key', '10', 'Free plan with 10 requests per minute refils 1 per 10 sec');

        // Test with pro plan
        await testPlan('pro', 'pro-plan-api-key', '30', '30 requests, refills 1 per 2 sec');
    }
    catch (e) {
        console.error('Error running tests:', e.message);
        process.exit(1);
    }
}

//call to main'
main();