const { createClient } = require('@clickhouse/client');
const path = require('path');
require('dotenv').config({ 
  path: path.resolve(__dirname, '../.env.development') 
});

const clickHouseClient = createClient({
    url: process.env.CH_URI,
    username: process.env.CH_USERNAME,
    password: process.env.CH_PASS,
    format: 'json',
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
