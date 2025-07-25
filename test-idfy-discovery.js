#!/usr/bin/env node

/**
 * IDfy API Discovery Script
 * Attempts to discover the correct API endpoints and authentication method
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  apiKey: process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
  accountId: process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
  username: process.env.IDFY_USERNAME || 'krishna.deepak@techivtta.in',
  password: process.env.IDFY_PASSWORD || 'hattyw-xudnyp-rAffe9'
};

async function discoverIDfyAPI() {
  console.log('🔍 IDfy API Discovery Process...');
  console.log(`API Key: ${API_CONFIG.apiKey.substring(0, 8)}...`);
  console.log(`Account ID: ${API_CONFIG.accountId}`);
  console.log(`Username: ${API_CONFIG.username}`);
  console.log('');

  // Extended list of possible base URLs
  const baseURLs = [
    'https://apicentral.idfy.com',
    'https://api.idfy.com',
    'https://eve.idfy.com',
    'https://sandbox.idfy.com',
    'https://idfy.com/api',
    'https://www.idfy.com/api',
    'https://apicentral.idfy.com/api',
    'https://prod.idfy.com',
    'https://production.idfy.com',
    'https://live.idfy.com'
  ];

  // Different authentication methods to try
  const authMethods = [
    {
      name: 'API Key Header',
      headers: { 'X-API-Key': API_CONFIG.apiKey, 'Content-Type': 'application/json' }
    },
    {
      name: 'API Key + Account ID',
      headers: { 
        'api-key': API_CONFIG.apiKey, 
        'account-id': API_CONFIG.accountId,
        'Content-Type': 'application/json' 
      }
    },
    {
      name: 'Basic Auth',
      headers: { 
        'Authorization': `Basic ${Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')}`,
        'Content-Type': 'application/json' 
      }
    },
    {
      name: 'Bearer Token',
      headers: { 
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'Content-Type': 'application/json' 
      }
    },
    {
      name: 'Combined Auth',
      headers: { 
        'Authorization': `Basic ${Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')}`,
        'api-key': API_CONFIG.apiKey,
        'account-id': API_CONFIG.accountId,
        'Content-Type': 'application/json' 
      }
    }
  ];

  // Test endpoints that might exist
  const testPaths = [
    '/',
    '/health',
    '/status',
    '/ping',
    '/api',
    '/api/health',
    '/api/status',
    '/v1',
    '/v2', 
    '/v3',
    '/api/v1',
    '/api/v2',
    '/api/v3',
    '/docs',
    '/swagger',
    '/api-docs'
  ];

  let workingConfig = null;

  // Try each base URL
  for (const baseURL of baseURLs) {
    console.log(`\n🌐 Testing Base URL: ${baseURL}`);
    
    // Try each authentication method
    for (const authMethod of authMethods) {
      console.log(`   🔐 Testing ${authMethod.name}...`);
      
      // Try each test path
      for (const path of testPaths) {
        try {
          const response = await axios.get(`${baseURL}${path}`, {
            headers: authMethod.headers,
            timeout: 5000,
            validateStatus: (status) => status < 500 // Accept 4xx as potentially valid
          });
          
          console.log(`      ✅ SUCCESS: ${baseURL}${path}`);
          console.log(`         Status: ${response.status}`);
          console.log(`         Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
          
          workingConfig = {
            baseURL,
            path,
            authMethod: authMethod.name,
            headers: authMethod.headers,
            status: response.status
          };
          
          // If we get a 200, that's definitely working
          if (response.status === 200) {
            break;
          }
          
        } catch (error) {
          // Only log if it's not a common error
          if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
            console.log(`      ⚠️  ${baseURL}${path}: ${error.response?.status || error.code}`);
          }
        }
      }
      
      if (workingConfig && workingConfig.status === 200) break;
    }
    
    if (workingConfig && workingConfig.status === 200) break;
  }

  if (workingConfig) {
    console.log('\n🎯 DISCOVERED WORKING CONFIGURATION:');
    console.log(`   Base URL: ${workingConfig.baseURL}`);
    console.log(`   Path: ${workingConfig.path}`);
    console.log(`   Auth Method: ${workingConfig.authMethod}`);
    console.log(`   Status: ${workingConfig.status}`);
    
    // Now try to find KYC-specific endpoints
    await testKYCEndpoints(workingConfig);
    
  } else {
    console.log('\n❌ No working API configuration discovered');
    console.log('\n💡 Suggestions:');
    console.log('   1. Verify the API credentials are correct and active');
    console.log('   2. Check if the account has API access enabled');
    console.log('   3. Contact IDfy support for correct API endpoints');
    console.log('   4. Check if there are IP restrictions on the API access');
  }
}

async function testKYCEndpoints(config) {
  console.log('\n🔍 Testing KYC-specific endpoints...');
  
  const kycPaths = [
    '/kyc',
    '/verification',
    '/verify',
    '/tasks',
    '/v3/tasks',
    '/api/v3/tasks',
    '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/api/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/v3/tasks/sync/verify_with_source/ind_pan',
    '/api/v3/tasks/sync/verify_with_source/ind_pan'
  ];
  
  for (const path of kycPaths) {
    try {
      const response = await axios.get(`${config.baseURL}${path}`, {
        headers: config.headers,
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      console.log(`   ✅ KYC Endpoint Found: ${path} (Status: ${response.status})`);
      
    } catch (error) {
      if (error.response?.status === 405) {
        console.log(`   📝 ${path}: Method not allowed (might need POST)`);
      } else if (error.response?.status === 401) {
        console.log(`   🔐 ${path}: Authentication required`);
      } else if (error.response?.status === 403) {
        console.log(`   🚫 ${path}: Forbidden (might need different permissions)`);
      }
    }
  }
}

// Run the discovery
discoverIDfyAPI().catch(console.error);
