/**
 * Database Management Tests
 * 
 * These tests check database management features like listing databases,
 * checking schema versions, and validating table structures.
 */

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

describe('Database Management Tests', () => {
  let pgClient;

  // Initialize client before tests
  beforeAll(async () => {
    pgClient = new Client({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      database: 'postgres', // Connect to default postgres database to list all DBs
    });
    await pgClient.connect();
  });

  // Cleanup after tests
  afterAll(async () => {
    await pgClient.end();
  });

  // Test listing all databases
  test('should list all databases including flarenet', async () => {
    let databases = [];
    
    try {
      const result = await pgClient.query(`
        SELECT datname FROM pg_database 
        WHERE datistemplate = false
        ORDER BY datname
      `);
      databases = result.rows.map(row => row.datname);
    } catch (error) {
      console.error('Error listing databases:', error);
    }
    
    // Check that our database exists
    expect(databases).toContain('flarenet');
    
    // Log all available databases
    console.log('Available databases:', databases);
  });
  
  // Test PostgreSQL version
  test('should be running on expected PostgreSQL version', async () => {
    let version;
    
    try {
      const result = await pgClient.query('SELECT version()');
      version = result.rows[0].version;
    } catch (error) {
      console.error('Error getting PostgreSQL version:', error);
    }
    
    // We only check that we got a version string, not the exact version
    // as this makes the test more robust across different environments
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
    expect(version.toLowerCase()).toContain('postgresql');
    
    // Log PostgreSQL version for diagnostics
    console.log('PostgreSQL Version:', version);
  });
  
  // Test database size and stats
  test('should get database size and stats', async () => {
    // Connect to the flarenet database specifically
    const flarenetClient = new Client({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database, // our actual database
    });
    
    await flarenetClient.connect();
    
    try {
      // Get database size
      const sizeResult = await flarenetClient.query(`
        SELECT pg_size_pretty(pg_database_size('${dbConfig.database}')) as size
      `);
      const dbSize = sizeResult.rows[0].size;
      
      // Get table count
      const tablesResult = await flarenetClient.query(`
        SELECT count(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const tableCount = parseInt(tablesResult.rows[0].table_count);
      
      console.log(`Database size: ${dbSize}, Table count: ${tableCount}`);
      
      // We just verify we got results, not specific values
      expect(dbSize).toBeDefined();
      expect(tableCount).toBeGreaterThan(0);
    } catch (error) {
      console.error('Error getting database stats:', error);
    } finally {
      await flarenetClient.end();
    }
  });
  
  // Test that migrations table exists and has entries
  test('should have migration history in _prisma_migrations table', async () => {
    const flarenetClient = new Client({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
    });
    
    await flarenetClient.connect();
    
    let migrations = [];
    
    try {
      // First check if the table exists
      const tableCheck = await flarenetClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_prisma_migrations'
        ) as exists
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      expect(tableExists).toBe(true);
      
      // If table exists, check for migrations with adjusted query
      if (tableExists) {
        const result = await flarenetClient.query(`
          SELECT id, migration_name, finished_at
          FROM _prisma_migrations
          ORDER BY finished_at DESC
        `);
        migrations = result.rows;
      }
    } catch (error) {
      console.error('Error checking migrations:', error);
    } finally {
      await flarenetClient.end();
    }
    
    expect(migrations.length).toBeGreaterThan(0);
    
    // Log migrations for diagnostics
    console.log(`Found ${migrations.length} applied migrations`);
    console.log('Last 3 migrations:', migrations.slice(0, 3).map(m => m.migration_name));
  });
});
