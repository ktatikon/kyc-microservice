#!/usr/bin/env node

/**
 * IDfy Integration Test Script
 * Tests the real IDfy API integration with provided credentials
 */

require('dotenv').config();
const path = require('path');

// Determine if we're running from kyc-service directory or services directory
const isInKycService = __dirname.endsWith('kyc-service');
const sharedPath = isInKycService ? '../shared' : './shared';
const servicePath = isInKycService ? './services/kyc.service' : './kyc-service/services/kyc.service';

const kycService = require(servicePath); // This is a singleton instance, not a class
const redisManager = require(path.join(sharedPath, 'redis'));
const logger = require(path.join(sharedPath, 'logger'));

// Test configuration
const TEST_CONFIG = {
  // Test Aadhaar number (use a valid format for testing - this is a valid format but fake number)
  testAadhaarNumber: '234567890123', // Valid format: starts with 2-9, 12 digits
  testPanNumber: 'ABCDE1234F', // Replace with valid test PAN
  testPassportNumber: 'A1234567', // Replace with valid test passport
  testDOB: '1990-01-01',
  testUserId: 'test-user-' + Date.now()
};

class IDfyIntegrationTester {
  constructor() {
    this.kycService = kycService; // Use the singleton instance
    this.testResults = {
      aadhaarOTP: { initiated: false, verified: false },
      panVerification: { completed: false },
      passportVerification: { completed: false },
      errors: []
    };
  }

  /**
   * Initialize test environment
   */
  async initialize() {
    try {
      console.log('🚀 Initializing IDfy Integration Test...');
      
      // Initialize Redis connection
      await redisManager.initialize();
      console.log('✅ Redis connection established');

      // Verify IDfy configuration
      this.verifyConfiguration();
      console.log('✅ IDfy configuration verified');

      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Verify IDfy configuration
   */
  verifyConfiguration() {
    const requiredEnvVars = [
      'IDFY_API_KEY',
      'IDFY_ACCOUNT_ID',
      'IDFY_BASE_URL'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('📋 IDfy Configuration:');
    console.log(`   API Key: ${process.env.IDFY_API_KEY?.substring(0, 8)}...`);
    console.log(`   Account ID: ${process.env.IDFY_ACCOUNT_ID}`);
    console.log(`   Base URL: ${process.env.IDFY_BASE_URL}`);
  }

  /**
   * Test Aadhaar OTP initiation
   */
  async testAadhaarOTPInitiation() {
    try {
      console.log('\n🔐 Testing Aadhaar OTP Initiation...');
      
      const result = await this.kycService.sendAadhaarOtp(
        TEST_CONFIG.testAadhaarNumber,
        TEST_CONFIG.testUserId
      );

      if (result.success && result.taskId) {
        this.testResults.aadhaarOTP.initiated = true;
        this.testResults.aadhaarOTP.taskId = result.taskId;
        
        console.log('✅ Aadhaar OTP initiated successfully');
        console.log(`   Task ID: ${result.taskId}`);
        console.log(`   Message: ${result.message}`);
        
        return result;
      } else {
        throw new Error('OTP initiation failed - no task ID received');
      }
    } catch (error) {
      console.error('❌ Aadhaar OTP initiation failed:', error.message);
      this.testResults.errors.push({
        test: 'aadhaarOTPInitiation',
        error: error.message
      });
      return null;
    }
  }

  /**
   * Test PAN verification
   */
  async testPANVerification() {
    try {
      console.log('\n🆔 Testing PAN Verification...');
      
      const result = await this.kycService.verifyPAN(
        TEST_CONFIG.testPanNumber,
        TEST_CONFIG.testUserId
      );

      if (result.success) {
        this.testResults.panVerification.completed = true;
        
        console.log('✅ PAN verification completed successfully');
        console.log(`   Status: ${result.data?.status}`);
        console.log(`   Valid: ${result.verificationData?.isValid}`);
        
        return result;
      } else {
        throw new Error('PAN verification failed');
      }
    } catch (error) {
      console.error('❌ PAN verification failed:', error.message);
      this.testResults.errors.push({
        test: 'panVerification',
        error: error.message
      });
      return null;
    }
  }

  /**
   * Test Passport verification
   */
  async testPassportVerification() {
    try {
      console.log('\n📘 Testing Passport Verification...');
      
      const result = await this.kycService.verifyPassport(
        TEST_CONFIG.testPassportNumber,
        TEST_CONFIG.testDOB,
        TEST_CONFIG.testUserId
      );

      if (result.success) {
        this.testResults.passportVerification.completed = true;
        
        console.log('✅ Passport verification completed successfully');
        console.log(`   Status: ${result.data?.status}`);
        console.log(`   Valid: ${result.verificationData?.isValid}`);
        
        return result;
      } else {
        throw new Error('Passport verification failed');
      }
    } catch (error) {
      console.error('❌ Passport verification failed:', error.message);
      this.testResults.errors.push({
        test: 'passportVerification',
        error: error.message
      });
      return null;
    }
  }

  /**
   * Test Redis integration
   */
  async testRedisIntegration() {
    try {
      console.log('\n💾 Testing Redis Integration...');
      
      const testKey = `kyc:test:${Date.now()}`;
      const testData = { test: true, timestamp: new Date().toISOString() };
      
      // Set data
      await redisManager.set(testKey, testData, 60);
      
      // Get data
      const retrievedData = await redisManager.get(testKey);
      
      if (retrievedData && retrievedData.test === true) {
        console.log('✅ Redis integration working correctly');
        
        // Cleanup
        await redisManager.del(testKey);
        return true;
      } else {
        throw new Error('Redis data retrieval failed');
      }
    } catch (error) {
      console.error('❌ Redis integration failed:', error.message);
      this.testResults.errors.push({
        test: 'redisIntegration',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 IDfy Integration Test Report');
    console.log('=====================================');
    
    console.log('\n✅ Successful Tests:');
    if (this.testResults.aadhaarOTP.initiated) {
      console.log('   • Aadhaar OTP Initiation');
    }
    if (this.testResults.panVerification.completed) {
      console.log('   • PAN Verification');
    }
    if (this.testResults.passportVerification.completed) {
      console.log('   • Passport Verification');
    }

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }

    const totalTests = 3; // aadhaar, pan, passport
    const passedTests = [
      this.testResults.aadhaarOTP.initiated,
      this.testResults.panVerification.completed,
      this.testResults.passportVerification.completed
    ].filter(Boolean).length;

    console.log(`\n📈 Overall Success Rate: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (this.testResults.aadhaarOTP.taskId) {
      console.log(`\n🔑 Aadhaar Task ID for manual OTP testing: ${this.testResults.aadhaarOTP.taskId}`);
      console.log('   Use this task ID to test OTP verification manually');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    const initialized = await this.initialize();
    if (!initialized) {
      process.exit(1);
    }

    // Run tests sequentially
    await this.testRedisIntegration();
    await this.testAadhaarOTPInitiation();
    await this.testPANVerification();
    await this.testPassportVerification();

    // Generate report
    this.generateReport();

    // Cleanup
    await this.cleanup();
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    try {
      console.log('\n🧹 Cleaning up test environment...');
      
      // Close Redis connection
      if (redisManager.isConnected) {
        await redisManager.close();
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new IDfyIntegrationTester();
  
  tester.runAllTests()
    .then(() => {
      console.log('\n🎉 IDfy Integration Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = IDfyIntegrationTester;
