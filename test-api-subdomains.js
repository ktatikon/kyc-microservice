#!/usr/bin/env node

/**
 * Test API subdomains and paths to find the actual API endpoint
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  apiKey: process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
  accountId: process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
  username: process.env.IDFY_USERNAME || 'krishna.deepak@techivtta.in',
  password: process.env.IDFY_PASSWORD || 'hattyw-xudnyp-rAffe9'
};

async function testAPISubdomains() {
  console.log('🔍 Testing API Subdomains and Paths...');
  console.log(`API Key: ${API_CONFIG.apiKey.substring(0, 8)}...`);
  console.log('');

  // Try different API base URLs that might be the actual API
  const apiBaseURLs = [
    'https://api.apicentral.idfy.com',
    'https://apicentral.idfy.com/api',
    'https://apicentral.idfy.com/api/v1',
    'https://apicentral.idfy.com/api/v2',
    'https://apicentral.idfy.com/api/v3',
    'https://rest.apicentral.idfy.com',
    'https://gateway.apicentral.idfy.com',
    'https://prod.apicentral.idfy.com',
    'https://live.apicentral.idfy.com',
    'https://api.idfy.com',
    'https://rest.idfy.com',
    'https://gateway.idfy.com',
    'https://prod.idfy.com',
    'https://live.idfy.com'
  ];

  // Different authentication methods
  const authMethods = [
    {
      name: 'X-API-Key',
      headers: { 
        'X-API-Key': API_CONFIG.apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'api-key + account-id',
      headers: { 
        'api-key': API_CONFIG.apiKey,
        'account-id': API_CONFIG.accountId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Authorization Bearer',
      headers: { 
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Basic Auth',
      headers: { 
        'Authorization': `Basic ${Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    }
  ];

  let workingAPIConfig = null;

  // Test each base URL
  for (const baseURL of apiBaseURLs) {
    console.log(`\n🌐 Testing: ${baseURL}`);
    
    for (const authMethod of authMethods) {
      console.log(`   🔐 Auth: ${authMethod.name}`);
      
      // Test common API endpoints
      const testEndpoints = [
        '/',
        '/health',
        '/status',
        '/v3/tasks',
        '/tasks',
        '/verify'
      ];
      
      for (const endpoint of testEndpoints) {
        try {
          const response = await axios.get(`${baseURL}${endpoint}`, {
            headers: authMethod.headers,
            timeout: 5000,
            validateStatus: (status) => status < 500
          });
          
          // Check if response is JSON (API) or HTML (web interface)
          const isJSON = response.headers['content-type']?.includes('application/json');
          const isHTML = response.data?.includes('<!DOCTYPE html>');
          
          if (isJSON || (!isHTML && response.status === 200)) {
            console.log(`      ✅ API FOUND: ${baseURL}${endpoint}`);
            console.log(`         Status: ${response.status}`);
            console.log(`         Content-Type: ${response.headers['content-type']}`);
            console.log(`         Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
            
            workingAPIConfig = {
              baseURL,
              endpoint,
              authMethod: authMethod.name,
              headers: authMethod.headers
            };
            break;
          } else if (response.status === 200 && !isHTML) {
            console.log(`      ⚠️  Possible API: ${baseURL}${endpoint} (Status: ${response.status})`);
          }
          
        } catch (error) {
          if (error.response?.status === 401) {
            console.log(`      🔐 ${baseURL}${endpoint}: Authentication required`);
          } else if (error.response?.status === 403) {
            console.log(`      🚫 ${baseURL}${endpoint}: Forbidden`);
          } else if (error.response?.status === 404) {
            // Skip 404s as they're expected
          } else if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
            console.log(`      ❌ ${baseURL}${endpoint}: ${error.response?.status || error.code}`);
          }
        }
      }
      
      if (workingAPIConfig) break;
    }
    
    if (workingAPIConfig) break;
  }

  if (workingAPIConfig) {
    console.log('\n🎯 FOUND WORKING API CONFIGURATION:');
    console.log(`   Base URL: ${workingAPIConfig.baseURL}`);
    console.log(`   Endpoint: ${workingAPIConfig.endpoint}`);
    console.log(`   Auth Method: ${workingAPIConfig.authMethod}`);
    
    // Test KYC endpoints with this configuration
    await testKYCWithWorkingConfig(workingAPIConfig);
    
  } else {
    console.log('\n❌ No working API configuration found');
    console.log('\n💡 The credentials might be for:');
    console.log('   1. A different IDfy service or product');
    console.log('   2. A sandbox/test environment with different URLs');
    console.log('   3. An older API version that uses different endpoints');
    console.log('   4. A custom enterprise setup with different base URLs');
    console.log('\n🔧 Recommendations:');
    console.log('   1. Check IDfy documentation for the correct API base URL');
    console.log('   2. Contact IDfy support to verify the credentials and endpoints');
    console.log('   3. Check if there are environment-specific URLs (sandbox vs production)');
  }
}

async function testKYCWithWorkingConfig(config) {
  console.log('\n🔍 Testing KYC endpoints with working configuration...');
  
  const kycTests = [
    {
      name: 'Aadhaar OTP Initiation',
      method: 'POST',
      endpoint: '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
      payload: {
        task_id: `aadhaar_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          aadhaar_number: '234567890123',
          consent: 'Y'
        }
      }
    },
    {
      name: 'PAN Verification',
      method: 'POST',
      endpoint: '/v3/tasks/sync/verify_with_source/ind_pan',
      payload: {
        task_id: `pan_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: 'ABCDE1234F'
        }
      }
    }
  ];
  
  for (const test of kycTests) {
    try {
      console.log(`\n   Testing ${test.name}...`);
      const response = await axios[test.method.toLowerCase()](`${config.baseURL}${test.endpoint}`, test.payload, {
        headers: config.headers,
        timeout: 10000
      });
      
      console.log(`   ✅ ${test.name} SUCCESS:`);
      console.log(`      Status: ${response.status}`);
      console.log(`      Response: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      console.log(`   ❌ ${test.name} Failed:`);
      console.log(`      Status: ${error.response?.status}`);
      console.log(`      Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log(`      Details: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
}

testAPISubdomains().catch(console.error);
