/**
 * Database Connection Tests
 * 
 * This file contains tests for database connectivity, particularly
 * focusing on the ExCloud PostgreSQL instance.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

// Helper function to wait for database operations to complete
const waitForOperation = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Database Connection Tests', () => {
  // Test database connection
  test('should connect to the database', async () => {
    let connected = false;
    try {
      // Run a simple query to test connection
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      connected = result && result.length > 0 && result[0].test === 1;
    } catch (error) {
      console.error('Database connection error:', error);
      connected = false;
    }
    
    expect(connected).toBe(true);
  }, 10000); // Increase timeout for network operations
  
  // Test querying tables
  test('should be able to query database tables', async () => {
    let tables = [];
    try {
      // Query for all public tables
      tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
    } catch (error) {
      console.error('Error querying tables:', error);
    }
    
    // Check for essential tables
    const expectedTables = ['User', 'Project', 'Deployment', 'Profile'];
    const foundTableNames = tables.map(t => t.table_name);
    
    expectedTables.forEach(tableName => {
      expect(foundTableNames.some(t => t === tableName)).toBe(true);
    });
  });
  
  // Test _prisma_migrations table existence
  test('should have _prisma_migrations table with applied migrations', async () => {
    // Use the direct PostgreSQL client for better type handling
    const { Client } = require('pg');
    
    // Extract connection details safely without exposing password in code
    const getDbConfig = () => {
      try {
        const url = new URL(process.env.DATABASE_URL || '');
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
    
    const pgClient = new Client({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
    
    await pgClient.connect();
    
    let migrations = [];
    try {
      // First check if the table exists
      const tableCheck = await pgClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_prisma_migrations'
        ) as exists
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      expect(tableExists).toBe(true);
      
      // If table exists, check for migrations
      if (tableExists) {
        const result = await pgClient.query(`
          SELECT id, migration_name, finished_at
          FROM _prisma_migrations
          ORDER BY finished_at DESC
        `);
        migrations = result.rows;
      }
    } catch (error) {
      console.error('Error querying migrations:', error);
    } finally {
      await pgClient.end();
    }
    
    // We should have at least 1 migration applied
    expect(migrations.length).toBeGreaterThan(0);
    
    // Check if our latest migrations are applied
    const latestMigrationNames = migrations.slice(0, 3).map(m => m.migration_name);
    expect(latestMigrationNames).toContain('20250131111716_production_time');
  });

  // Test simple write operation
  test('should be able to write and read data', async () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'USER',
      password: 'hashed_password_would_go_here'
    };
    
    let createdUser;
    let retrievedUser;
    
    try {
      // Create a test user
      createdUser = await prisma.user.create({
        data: testUser
      });
      
      // Wait a moment for write to propagate
      await waitForOperation(100);
      
      // Try to retrieve the user
      retrievedUser = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      
      // Clean up - delete the test user
      await prisma.user.delete({
        where: { id: createdUser.id }
      });
      
    } catch (error) {
      console.error('Error in write/read test:', error);
    }
    
    expect(createdUser).toBeDefined();
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser.email).toBe(testUser.email);
    expect(retrievedUser.name).toBe(testUser.name);
  });

  // Clean up after all tests
  afterAll(async () => {
    await prisma.$disconnect();
  });
});
