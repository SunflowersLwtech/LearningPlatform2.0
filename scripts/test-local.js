const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Test configuration
const config = {
    testDatabase: process.env.MONGODB_URI_TEST || process.env.MONGODB_URI,
    timeout: 30000
};

// Basic test suite
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, total: 0 };
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('🚀 Starting test suite...\n');
        
        for (const test of this.tests) {
            this.results.total++;
            try {
                console.log(`📋 Running: ${test.name}`);
                await test.fn();
                console.log(`✅ PASSED: ${test.name}`);
                this.results.passed++;
            } catch (error) {
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${error.message}`);
                this.results.failed++;
            }
            console.log('');
        }

        this.printResults();
    }

    printResults() {
        console.log('📊 Test Results:');
        console.log(`   Total: ${this.results.total}`);
        console.log(`   Passed: ${this.results.passed}`);
        console.log(`   Failed: ${this.results.failed}`);
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed.');
        }
    }
}

// Database connection test
async function testDatabaseConnection() {
    if (!config.testDatabase) {
        throw new Error('Database URI not configured');
    }

    const conn = await mongoose.connect(config.testDatabase, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    if (!conn.connection.readyState) {
        throw new Error('Database connection failed');
    }

    await mongoose.disconnect();
}

// Environment variables test
async function testEnvironmentVariables() {
    const required = ['JWT_SECRET', 'MONGODB_URI'];
    
    for (const envVar of required) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
}

// File existence test
async function testRequiredFiles() {
    const fs = require('fs');
    const requiredFiles = [
        '../config/database.js',
        '../server.js',
        '../package.json',
        '../.env.example'
    ];

    for (const file of requiredFiles) {
        const filePath = path.resolve(__dirname, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Required file missing: ${file}`);
        }
    }
}

// Security configuration test
async function testSecurityConfig() {
    const serverPath = path.resolve(__dirname, '../server.js');
    const fs = require('fs');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check for security measures
    if (!serverContent.includes('corsOptions')) {
        throw new Error('CORS configuration not found');
    }
    
    if (!serverContent.includes('requiredEnvVars')) {
        throw new Error('Environment variable validation not found');
    }
}

// Run tests
async function main() {
    const runner = new TestRunner();
    
    runner.test('Environment Variables', testEnvironmentVariables);
    runner.test('Required Files', testRequiredFiles);
    runner.test('Security Configuration', testSecurityConfig);
    runner.test('Database Connection', testDatabaseConnection);
    
    await runner.run();
    
    // Exit with error code if tests failed
    if (runner.results.failed > 0) {
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
main().catch((error) => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
});