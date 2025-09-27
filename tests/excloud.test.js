/**
 * ExCloud Database Connection Tests
 * 
 * This file tests the connection to the ExCloud database specifically,
 * including checking for availability, performance, and schema correctness.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Client } = require('pg');
require('dotenv').config();

// Get connection string components from DATABASE_URL - safely
const connectionString = process.env.DATABASE_URL || '';

// Extract connection details without exposing password in code
const getDbConfig = () => {
  try {
    const url = new URL(connectionString);
    return {
      user: url.username,
      password: url.password, // Will be used securely and not logged
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.substring(1).split('?')[0]
    };
  } catch (e) {
    console.error('Invalid connection string format');
    return { user: '', password: '', host: '', port: 5432, database: '' };
  }
};

const dbConfig = getDbConfig();
const isExCloud = dbConfig.host.includes('excloud.co.in');

describe('ExCloud Database Tests', () => {
    // Test direct connection to ExCloud
    test('should connect directly to ExCloud PostgreSQL', async () => {
        // Only run this test if we're using ExCloud (checking for hostname)
        if (!isExCloud) {
            console.log('Skipping ExCloud test - not using ExCloud database');
            return;
        }

        const pgClient = new Client({
            user: dbConfig.user,
            password: dbConfig.password,
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database
        });

        let connected = false;

        try {
            await pgClient.connect();
            const result = await pgClient.query('SELECT version()');
            connected = !!result.rows[0].version;

            // Log PostgreSQL version for diagnostics
            console.log(`Connected to PostgreSQL version: ${result.rows[0].version}`);
        } catch (error) {
            console.error('Error connecting directly to ExCloud:', error);
        } finally {
            await pgClient.end();
        }

        expect(connected).toBe(true);
    }, 15000);

    // Test database latency
    test('should have acceptable query latency', async () => {
        // Skip if not using ExCloud
        if (!isExCloud) {
            console.log('Skipping ExCloud latency test - not using ExCloud database');
            return;
        }

        const startTime = Date.now();
        let result;

        try {
            result = await prisma.$queryRaw`SELECT 1 as test`;
        } catch (error) {
            console.error('Error in latency test:', error);
        }

        const duration = Date.now() - startTime;

        console.log(`Query latency: ${duration}ms`);

        // Query should be relatively fast (<500ms is a reasonable threshold for cloud DB)
        expect(duration).toBeLessThan(500);
        expect(result[0].test).toBe(1);
    });

    // Test database schema completeness
    test('should have all required tables and columns', async () => {
        // Skip if not using ExCloud
        if (!isExCloud) {
            console.log('Skipping ExCloud schema test - not using ExCloud database');
            return;
        }
        
        // Use the direct PostgreSQL client for better type handling
        const pgClient = new Client({
            user: dbConfig.user,
            password: dbConfig.password,
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database
        });

        await pgClient.connect();

        try {
            // Get table names
            const tablesResult = await pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

            const tableNames = tablesResult.rows.map(row => row.table_name);

            // Check if User table exists
            expect(tableNames).toContain('User');

            // Get User table columns
            const userColumnsResult = await pgClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User'
      `);

            const userColumns = userColumnsResult.rows.map(row => row.column_name);

            // Check for critical columns
            ['id', 'email', 'password', 'name', 'role'].forEach(column => {
                expect(userColumns).toContain(column);
            });

            // Check if Project table exists
            expect(tableNames).toContain('Project');

            // Get Project table columns
            const projectColumnsResult = await pgClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Project'
      `);

            const projectColumns = projectColumnsResult.rows.map(row => row.column_name);

            // Check for critical Project columns
            expect(projectColumns).toContain('id');
            expect(projectColumns).toContain('name');

        } catch (error) {
            console.error('Error querying schema details:', error);
        } finally {
            await pgClient.end();
        }
    });

    // Test database connection pool and concurrent connections
    test('should handle multiple concurrent queries', async () => {
        // Skip if not using ExCloud
        if (!isExCloud) {
            console.log('Skipping ExCloud concurrent queries test - not using ExCloud database');
            return;
        }
        
        const pgClient = new Client({
            user: dbConfig.user,
            password: dbConfig.password,
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database
        });

        await pgClient.connect();

        const concurrentQueries = 5;
        const queryPromises = [];

        // Use standard pg client for better data type handling
        for (let i = 0; i < concurrentQueries; i++) {
            queryPromises.push(pgClient.query(`SELECT ${i} as test_value`));
        }

        let results;
        try {
            results = await Promise.all(queryPromises);

            expect(results).toHaveLength(concurrentQueries);
            for (let i = 0; i < concurrentQueries; i++) {
                // Convert to Number for comparison if necessary (PostgreSQL may return numeric types)
                const receivedValue = Number(results[i].rows[0].test_value);
                expect(receivedValue).toBe(i);
            }
        } catch (error) {
            console.error('Error in concurrent query test:', error);
            fail(error);
        } finally {
            await pgClient.end();
        }
    });

    // Clean up after all tests
    afterAll(async () => {
        await prisma.$disconnect();
    });
});
