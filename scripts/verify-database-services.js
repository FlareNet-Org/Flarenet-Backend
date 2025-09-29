#!/usr/bin/env node

/**
 * Database Service Verification Script
 * 
 * This script checks both Redis Cloud and PostgreSQL services
 * to ensure they are properly configured and connected.
 */

const dotenv = require('dotenv');
const path = require('path');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

// Load environment files
const redisCloudPath = path.resolve(__dirname, '..', '.env.redis-cloud');
const developmentPath = path.resolve(__dirname, '..', '.env.development');

console.log(`${colors.cyan}======= Database Services Verification =======`);
console.log(`${colors.cyan}Started at: ${new Date().toLocaleString()}${colors.reset}`);

// Initialize checklist status
const checklistStatus = {
  redisConfigExists: false,
  redisConnection: false,
  redisOperations: false,
  pgConfigExists: false,
  pgConnection: false,
  pgOperations: false
};

async function checkServices() {
  try {
    // Check 1: Verify Redis Cloud configuration file exists
    try {
      require('fs').accessSync(redisCloudPath, require('fs').constants.F_OK);
      console.log(`${colors.green}✓ Redis Cloud configuration file exists${colors.reset}`);
      checklistStatus.redisConfigExists = true;
    } catch (error) {
      console.log(`${colors.red}✗ Redis Cloud configuration file not found${colors.reset}`);
      console.log(`  Expected at: ${redisCloudPath}`);
    }

    // Load Redis configuration
    if (checklistStatus.redisConfigExists) {
      dotenv.config({ path: redisCloudPath });
      console.log(`\n${colors.blue}Redis Configuration:${colors.reset}`);
      console.log(`Host: ${maskCredential(process.env.REDIS_HOST || 'Not defined')}`);
      console.log(`Port: ${process.env.REDIS_PORT || 'Not defined'}`);
      console.log(`TLS Enabled: ${process.env.REDIS_USE_TLS || 'Not defined'}`);
      console.log(`URL Defined: ${process.env.REDIS_URL ? 'Yes' : 'No'}`);
    }

    // Check 2: Verify PostgreSQL configuration file exists
    try {
      require('fs').accessSync(developmentPath, require('fs').constants.F_OK);
      console.log(`\n${colors.green}✓ PostgreSQL configuration file exists${colors.reset}`);
      checklistStatus.pgConfigExists = true;
    } catch (error) {
      console.log(`\n${colors.red}✗ PostgreSQL configuration file not found${colors.reset}`);
      console.log(`  Expected at: ${developmentPath}`);
    }

    // Load PostgreSQL configuration
    if (checklistStatus.pgConfigExists) {
      dotenv.config({ path: developmentPath });
      console.log(`\n${colors.blue}PostgreSQL Configuration:${colors.reset}`);
      console.log(`User: ${maskCredential(process.env.POSTGRES_USER || 'Not defined')}`);
      console.log(`Database: ${process.env.POSTGRES_DB || 'Not defined'}`);
      console.log(`URL Defined: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    }

    // Check 3: Test Redis Cloud Connection
    console.log(`\n${colors.blue}Testing Redis Cloud Connection...${colors.reset}`);
    
    if (!process.env.REDIS_URL && !(process.env.REDIS_HOST && process.env.REDIS_PORT)) {
      console.log(`${colors.red}✗ Redis configuration is incomplete${colors.reset}`);
    } else {
      const redisClient = await connectToRedis();
      if (redisClient) {
        console.log(`${colors.green}✓ Redis connection successful${colors.reset}`);
        checklistStatus.redisConnection = true;
        
        // Test Redis operations
        const operationsResult = await testRedisOperations(redisClient);
        if (operationsResult) {
          console.log(`${colors.green}✓ Redis operations successful${colors.reset}`);
          checklistStatus.redisOperations = true;
        } else {
          console.log(`${colors.red}✗ Redis operations failed${colors.reset}`);
        }
        
        // Close Redis client
        await redisClient.quit();
        console.log('Redis client closed');
      } else {
        console.log(`${colors.red}✗ Redis connection failed${colors.reset}`);
      }
    }
    
    // Check 4: Test PostgreSQL Connection
    console.log(`\n${colors.blue}Testing PostgreSQL Connection...${colors.reset}`);
    
    if (!process.env.DATABASE_URL) {
      console.log(`${colors.red}✗ PostgreSQL configuration is incomplete${colors.reset}`);
    } else {
      const prisma = new PrismaClient();
      try {
        // Test connection by running a simple query
        await prisma.$connect();
        console.log(`${colors.green}✓ PostgreSQL connection successful${colors.reset}`);
        checklistStatus.pgConnection = true;
        
        // Run a sample query
        const result = await testPrismaOperations(prisma);
        if (result) {
          console.log(`${colors.green}✓ PostgreSQL operations successful${colors.reset}`);
          checklistStatus.pgOperations = true;
        } else {
          console.log(`${colors.red}✗ PostgreSQL operations failed${colors.reset}`);
        }
        
        // Disconnect Prisma client
        await prisma.$disconnect();
        console.log('PostgreSQL client closed');
        
      } catch (error) {
        console.log(`${colors.red}✗ PostgreSQL connection failed${colors.reset}`);
        console.log(`  Error: ${error.message}`);
      }
    }
    
    // Display final results
    console.log(`\n${colors.cyan}======= Verification Summary =======`);
    console.log(`Redis Configuration: ${formatStatus(checklistStatus.redisConfigExists)}`);
    console.log(`Redis Connection: ${formatStatus(checklistStatus.redisConnection)}`);
    console.log(`Redis Operations: ${formatStatus(checklistStatus.redisOperations)}`);
    console.log(`PostgreSQL Configuration: ${formatStatus(checklistStatus.pgConfigExists)}`);
    console.log(`PostgreSQL Connection: ${formatStatus(checklistStatus.pgConnection)}`);
    console.log(`PostgreSQL Operations: ${formatStatus(checklistStatus.pgOperations)}`);
    
    // Security check for credential exposure
    console.log(`\n${colors.cyan}======= Security Check =======`);
    await checkForExposedCredentials();
    
  } catch (error) {
    console.log(`\n${colors.red}An error occurred during verification:${colors.reset}`);
    console.log(error);
  }
}

// Helper function to connect to Redis
async function connectToRedis() {
  return new Promise((resolve) => {
    try {
      // Configure connection options
      const connectionOptions = {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
        retryStrategy: (times) => {
          if (times > 3) return null; // Only try 3 times for testing
          return 500;
        }
      };
      
      // Create Redis client
      let redisClient;
      if (process.env.REDIS_URL) {
        console.log('Using Redis URL for connection');
        redisClient = new Redis(process.env.REDIS_URL, connectionOptions);
      } else {
        console.log('Using Redis host/port for connection');
        redisClient = new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
          ...connectionOptions
        });
      }
      
      // Handle connection events
      redisClient.on('error', (err) => {
        console.log(`${colors.red}Redis Error: ${err.message}${colors.reset}`);
        resolve(null);
      });
      
      redisClient.on('ready', () => {
        resolve(redisClient);
      });
      
      // Set a timeout in case connection hangs
      setTimeout(() => {
        if (redisClient.status !== 'ready') {
          console.log(`${colors.yellow}Redis connection timed out${colors.reset}`);
          redisClient.disconnect();
          resolve(null);
        }
      }, 10000);
      
    } catch (error) {
      console.log(`${colors.red}Redis initialization error: ${error.message}${colors.reset}`);
      resolve(null);
    }
  });
}

// Helper function to test Redis operations
async function testRedisOperations(redisClient) {
  try {
    // Test 1: Set a key
    console.log('Testing SET operation...');
    await redisClient.set('test:verification', `Tested at ${new Date().toISOString()}`);
    
    // Test 2: Get the key
    console.log('Testing GET operation...');
    const value = await redisClient.get('test:verification');
    console.log(`Retrieved value: ${value}`);
    
    // Test 3: Hash operations
    console.log('Testing HASH operations...');
    await redisClient.hset('test:hash', 'field1', 'value1');
    const hashValue = await redisClient.hget('test:hash', 'field1');
    console.log(`Hash value: ${hashValue}`);
    
    // Cleanup
    await redisClient.del('test:verification');
    await redisClient.del('test:hash');
    
    return true;
  } catch (error) {
    console.log(`${colors.red}Redis operation error: ${error.message}${colors.reset}`);
    return false;
  }
}

// Helper function to test PostgreSQL operations
async function testPrismaOperations(prisma) {
  try {
    console.log('Testing database operations...');
    
    // Get count of users table
    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}`);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}PostgreSQL operation error: ${error.message}${colors.reset}`);
    return false;
  }
}

// Helper function to check for exposed credentials in files
async function checkForExposedCredentials() {
  try {
    // Files to check
    const filesToCheck = [
      '.env.example',
      '.env.redis-cloud.example',
      '.env.development.example',
      'docker-compose.yml',
      'docker-compose.redis-cloud.yml',
      'start-with-redis-cloud.bat',
      'start-with-redis-cloud.sh'
    ];
    
    const fs = require('fs').promises;
    const path = require('path');
    
    // Patterns that might indicate hardcoded credentials
    const patterns = [
      /password\s*=\s*['"][^'"]+['"]/i,
      /REDIS_PASSWORD\s*=\s*[^$].*$/im,
      /POSTGRES_PASSWORD\s*=\s*[^$].*$/im,
      /@.*:[^$].*@/i,  // URL with credentials
      /:[^$][^@]*@/i    // URL with password
    ];
    
    let foundCredentials = false;
    
    for (const file of filesToCheck) {
      const filePath = path.resolve(__dirname, '..', file);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        for (const pattern of patterns) {
          const matches = content.match(pattern);
          
          if (matches && !isExampleCredential(matches[0])) {
            if (!foundCredentials) {
              console.log(`${colors.yellow}Potential credential exposure found:${colors.reset}`);
              foundCredentials = true;
            }
            console.log(`- File: ${file}`);
            console.log(`  Pattern: ${pattern}`);
            console.log(`  Match: ${maskCredential(matches[0])}`);
          }
        }
      } catch (err) {
        // Skip if file doesn't exist
        if (err.code !== 'ENOENT') {
          console.error(`Error reading file ${file}: ${err.message}`);
        }
      }
    }
    
    if (!foundCredentials) {
      console.log(`${colors.green}No potential credential exposure found in checked files${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Note: Some matches might be false positives or example credentials${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}Security check error: ${error.message}${colors.reset}`);
  }
}

// Helper function to determine if a credential is an example placeholder
function isExampleCredential(text) {
  const examplePatterns = [
    /your[-_]password/i,
    /changeme/i,
    /example/i,
    /placeholder/i,
    /your[-_]/i
  ];
  
  return examplePatterns.some(pattern => pattern.test(text));
}

// Helper function to mask credential values
function maskCredential(text) {
  if (!text) return text;
  
  // If it looks like a full URL with credentials, mask just the credentials part
  if (text.includes('@') && (text.includes('://') || text.includes(':'))) {
    return text.replace(/\/\/(.*):(.*)@/, '//[USER]:[MASKED]@');
  }
  
  // If it looks like a key=value with password, mask the value
  if (text.toLowerCase().includes('password') && text.includes('=')) {
    return text.replace(/=(.+)$/, '=[MASKED]');
  }
  
  // For host values, keep the domain but mask subdomain
  if (text.includes('.redns.redis-cloud.com')) {
    return text.replace(/([^.]+)\.crce/, '[MASKED].crce');
  }
  
  // Default - if it doesn't match special cases and isn't very short
  if (text.length > 10) {
    return text.substring(0, 3) + '...' + text.substring(text.length - 3);
  }
  
  return text;
}

// Helper function to format status for display
function formatStatus(status) {
  return status ? 
    `${colors.green}PASS${colors.reset}` : 
    `${colors.red}FAIL${colors.reset}`;
}

// Run the checks
checkServices().catch(error => {
  console.error('Verification script error:', error);
});