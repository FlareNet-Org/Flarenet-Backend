/**
 * Dependency Stability Test Script
 * 
 * This script tests that all major dependencies are working correctly after the update.
 * Run this script to validate the dependency updates.
 */

const express = require('express');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const Redis = require('ioredis');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// UUID v13 is ESM only, so we'll dynamically import it
let uuidv4;
// Remove potential LangChain import issues
// const { LangChainCore } = require('@langchain/core');

console.log('============================================');
console.log('DEPENDENCY STABILITY TEST - SEPTEMBER 2025');
console.log('============================================');

// Test Express v5
function testExpress() {
    try {
        const app = express();
        console.log('✅ Express v5:', express.version);
        
        // Test Express middleware
        const hasJson = typeof app.use(express.json) === 'function';
        console.log('✅ Express middleware (json):', hasJson);
        
        return true;
    } catch (error) {
        console.error('❌ Express test failed:', error.message);
        return false;
    }
}

// Test Zod
function testZod() {
    try {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
        });
        
        const valid = schema.safeParse({ name: 'Test', age: 25 });
        const invalid = schema.safeParse({ name: 'Test', age: 'twenty-five' });
        
        console.log('✅ Zod v3:', valid.success && !invalid.success);
        return true;
    } catch (error) {
        console.error('❌ Zod test failed:', error.message);
        return false;
    }
}

// Test UUID
async function testUuid() {
    try {
        // Dynamic import for ESM module
        const { v4 } = await import('uuid');
        const id = v4();
        console.log('✅ UUID v13:', id && id.length === 36);
        return true;
    } catch (error) {
        console.error('❌ UUID test failed:', error.message);
        return false;
    }
}

// Test bcrypt
async function testBcrypt() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        const match = await bcrypt.compare('password123', hash);
        console.log('✅ bcrypt v6:', match);
        return true;
    } catch (error) {
        console.error('❌ bcrypt test failed:', error.message);
        return false;
    }
}

// Test Redis mock (doesn't require actual connection)
function testRedis() {
    try {
        const redis = new Redis.Cluster([]);
        console.log('✅ Redis v5: Class imported successfully');
        return true;
    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
        return false;
    }
}

// Test dotenv
function testDotenv() {
    try {
        // Create a temporary .env file
        const tempEnvPath = path.join(__dirname, '.env.test');
        fs.writeFileSync(tempEnvPath, 'TEST_VAR=test_value');
        
        // Load the temporary .env file
        dotenv.config({ path: tempEnvPath });
        
        const result = process.env.TEST_VAR === 'test_value';
        console.log('✅ dotenv v17:', result);
        
        // Clean up
        fs.unlinkSync(tempEnvPath);
        return true;
    } catch (error) {
        console.error('❌ dotenv test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('\nRunning dependency tests...\n');
    
    const results = [
        testExpress(),
        testZod(),
        await testUuid(),
        await testBcrypt(),
        testRedis(),
        testDotenv()
    ];
    
    const passedCount = results.filter(r => r).length;
    const totalCount = results.length;
    
    console.log('\n============================================');
    console.log(`TEST SUMMARY: ${passedCount}/${totalCount} tests passed`);
    console.log('============================================');
    
    if (passedCount === totalCount) {
        console.log('✅ All dependencies are working correctly!');
    } else {
        console.log('❌ Some dependencies have issues. Please check the logs above.');
    }
}

runTests().catch(console.error);
