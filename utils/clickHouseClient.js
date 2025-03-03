const { createClient } = require('@clickhouse/client');
require('dotenv').config({ path: '../.env' });

const clickHouseClient = createClient({
    url: process.env.CH_URI, // Replace with your EC2 public IP
    username: process.env.CH_USERNAME, // Replace with your
    password: process.env.CH_PASS, // Replace with your
    format: 'json', // Response format
});



async function testConnection() {
    try {
        const query = 'SELECT version()';
        console.log('Executing query:', query);

        const resultSet = await clickHouseClient.query({ query, format: 'JSONEachRow' });

        console.log('ClickHouse Version:', await resultSet.json()); // Properly handle JSON response
    } catch (error) {
        console.error('Error querying ClickHouse:', error);
    }
}

// Run the test connection
testConnection();

module.exports = clickHouseClient;
