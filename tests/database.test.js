/**
 * Database Integration Tests
 * 
 * Comprehensive tests for database connectivity, performance, and schema validation.
 * This file consolidates all database-related tests following enterprise best practices.
 */

const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');
require('dotenv').config();

// Initialize clients
const prisma = new PrismaClient();

// Parse database configuration from environment
const getDbConfig = () => {
  try {
    const url = new URL(process.env.DATABASE_URL || '');
    return {
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.substring(1).split('?')[0],
      isExCloud: url.hostname.includes('excloud.co.in')
    };
  } catch (e) {
    console.error('Invalid database connection string');
    return { 
      user: '', password: '', host: '', port: 5432, database: '', 
      isExCloud: false 
    };
  }
};

const dbConfig = getDbConfig();

/**
 * Database test suite
 */
describe('Database Integration Tests', () => {
  // Setup - runs before all tests
  let pgClient;
  
  beforeAll(async () => {
    // Create PostgreSQL client for direct queries
    pgClient = new Client({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
    
    await pgClient.connect();
  });

  // Cleanup - runs after all tests
  afterAll(async () => {
    if (pgClient) await pgClient.end();
    await prisma.$disconnect();
  });

  describe('Connection Tests', () => {
    test('should connect to database and retrieve version', async () => {
      const result = await pgClient.query('SELECT version()');
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].version).toBeTruthy();
      
      // Log for diagnostic purposes only
      console.log(`Connected to PostgreSQL version: ${result.rows[0].version}`);
    }, 10000);
  });

  describe('Performance Tests', () => {
    test('should have acceptable query latency', async () => {
      const startTime = Date.now();
      
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      
      const duration = Date.now() - startTime;
      console.log(`Query latency: ${duration}ms`);
      
      expect(duration).toBeLessThan(500);
      expect(result[0].test).toBe(1);
    });

    test('should handle multiple concurrent queries', async () => {
      const concurrentQueries = 5;
      const queryPromises = [];
      
      for (let i = 0; i < concurrentQueries; i++) {
        queryPromises.push(pgClient.query(`SELECT ${i} as test_value`));
      }
      
      const results = await Promise.all(queryPromises);
      
      expect(results).toHaveLength(concurrentQueries);
      for (let i = 0; i < concurrentQueries; i++) {
        const receivedValue = Number(results[i].rows[0].test_value);
        expect(receivedValue).toBe(i);
      }
    });
  });

  describe('Schema Validation Tests', () => {
    test('should have all required tables and columns', async () => {
      // Get all tables in the public schema
      const tablesResult = await pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tableNames = tablesResult.rows.map(row => row.table_name);
      
      // Core tables that must exist
      const requiredTables = ['User', 'Project'];
      requiredTables.forEach(table => {
        expect(tableNames).toContain(table);
      });
      
      // Verify User table schema
      const userColumnsResult = await pgClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'User'
      `);
      
      const userColumns = userColumnsResult.rows.map(row => row.column_name);
      ['id', 'email', 'password', 'name', 'role'].forEach(column => {
        expect(userColumns).toContain(column);
      });
      
      // Verify Project table schema
      const projectColumnsResult = await pgClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Project'
      `);
      
      const projectColumns = projectColumnsResult.rows.map(row => row.column_name);
      ['id', 'name'].forEach(column => {
        expect(projectColumns).toContain(column);
      });
    });
  });

  describe('Data Integrity Tests', () => {
    test('should properly handle transactions', async () => {
      // Test transaction support using Prisma
      const result = await prisma.$transaction(async (tx) => {
        // Simple query to test transaction capability
        return await tx.$queryRaw`SELECT 1 as transaction_test`;
      });
      
      expect(result[0].transaction_test).toBe(1);
    });
  });
});
