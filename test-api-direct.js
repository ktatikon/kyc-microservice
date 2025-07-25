#!/usr/bin/env node

/**
 * Direct IDfy API Test
 * Tests the IDfy API endpoints directly to verify credentials and payload format
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  baseURL: process.env.IDFY_BASE_URL || 'https://apicentral.idfy.com',
  apiKey: process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
  accountId: process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
  username: process.env.IDFY_USERNAME || 'krishna.deepak@techivtta.in',
  password: process.env.IDFY_PASSWORD || 'hattyw-xudnyp-rAffe9'
};

// Test different authentication methods
const authMethods = [
  {
    name: 'API Key + Account ID Headers',
    headers: {
      'api-key': API_CONFIG.apiKey,
      'account-id': API_CONFIG.accountId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  {
    name: 'Basic Authentication',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  {
    name: 'Bearer Token (API Key)',
    headers: {
      'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  {
    name: 'Combined Auth (Basic + API Key)',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')}`,
      'api-key': API_CONFIG.apiKey,
      'account-id': API_CONFIG.accountId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
];

async function testAPIEndpoints() {
  console.log('🔍 Testing IDfy API Endpoints Systematically...');
  console.log(`Base URL: ${API_CONFIG.baseURL}`);
  console.log(`API Key: ${API_CONFIG.apiKey.substring(0, 8)}...`);
  console.log(`Account ID: ${API_CONFIG.accountId}`);
  console.log(`Username: ${API_CONFIG.username}`);
  console.log('');

  // Test different base URLs first
  const baseURLs = [
    'https://apicentral.idfy.com',
    'https://api.idfy.com',
    'https://eve.idfy.com',
    'https://sandbox.idfy.com'
  ];

  let workingBaseURL = null;
  let workingAuth = null;

  // Test 1: Find working base URL and authentication
  for (const baseURL of baseURLs) {
    console.log(`\n🌐 Testing Base URL: ${baseURL}`);

    for (const authMethod of authMethods) {
      console.log(`   Testing ${authMethod.name}...`);

      try {
        // Try a simple endpoint that should exist
        const testEndpoints = ['/health', '/v3/tasks', '/api/v3/tasks', '/status', '/'];

        for (const endpoint of testEndpoints) {
          try {
            const response = await axios.get(`${baseURL}${endpoint}`, {
              headers: authMethod.headers,
              timeout: 5000
            });
            console.log(`   ✅ SUCCESS: ${baseURL}${endpoint} - Status: ${response.status}`);
            console.log(`   ✅ Auth Method: ${authMethod.name}`);
            workingBaseURL = baseURL;
            workingAuth = authMethod;
            break;
          } catch (err) {
            // Continue to next endpoint
          }
        }

        if (workingBaseURL) break;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.status || error.code} - ${error.response?.data?.message || error.message}`);
      }
    }

    if (workingBaseURL) break;
  }

  if (!workingBaseURL) {
    console.log('\n❌ No working base URL and authentication combination found');
    return;
  }

  console.log(`\n🎯 Found working configuration:`);
  console.log(`   Base URL: ${workingBaseURL}`);
  console.log(`   Auth Method: ${workingAuth.name}`);

  // Continue with API endpoint testing using working configuration
  await testSpecificEndpoints(workingBaseURL, workingAuth.headers);
}

async function testSpecificEndpoints(baseURL, headers) {

  console.log('\n🔍 Testing Specific API Endpoints...');

  // Test Aadhaar OTP endpoints with different formats
  const aadhaarEndpoints = [
    '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/api/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/initiate/ind_aadhaar_otp',
    '/api/initiate/ind_aadhaar_otp',
    '/v2/tasks/async/verify_with_source/ind_aadhaar_otp'
  ];

  const aadhaarPayloads = [
    {
      name: 'IDfy Standard Format',
      payload: {
        task_id: `aadhaar_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          aadhaar_number: '234567890123',
          consent: 'Y',
          reason: 'KYC verification'
        }
      }
    },
    {
      name: 'Simple Source Format',
      payload: {
        source: {
          aadhaar: '234567890123'
        }
      }
    },
    {
      name: 'Direct Format',
      payload: {
        aadhaar_number: '234567890123',
        consent: 'Y'
      }
    }
  ];

  console.log('\n📱 Testing Aadhaar OTP Endpoints...');
  let workingAadhaarConfig = null;

  for (const endpoint of aadhaarEndpoints) {
    console.log(`\n   Testing endpoint: ${endpoint}`);

    for (const payloadTest of aadhaarPayloads) {
      try {
        console.log(`      Trying ${payloadTest.name}...`);
        const response = await axios.post(`${baseURL}${endpoint}`, payloadTest.payload, {
          headers,
          timeout: 10000
        });
        console.log(`      ✅ SUCCESS: ${response.status} - ${JSON.stringify(response.data)}`);
        workingAadhaarConfig = { endpoint, payload: payloadTest };
        break;
      } catch (error) {
        console.log(`      ❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    if (workingAadhaarConfig) break;
  }

  // Test PAN verification endpoints
  const panEndpoints = [
    '/v3/tasks/sync/verify_with_source/ind_pan',
    '/api/v3/tasks/sync/verify_with_source/ind_pan',
    '/v2/tasks/sync/verify_with_source/ind_pan'
  ];

  const panPayloads = [
    {
      name: 'IDfy Standard PAN Format',
      payload: {
        task_id: `pan_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: 'ABCDE1234F'
        }
      }
    },
    {
      name: 'Simple PAN Format',
      payload: {
        source: {
          id_number: 'ABCDE1234F'
        }
      }
    }
  ];

  console.log('\n🆔 Testing PAN Verification Endpoints...');
  let workingPanConfig = null;

  for (const endpoint of panEndpoints) {
    console.log(`\n   Testing endpoint: ${endpoint}`);

    for (const payloadTest of panPayloads) {
      try {
        console.log(`      Trying ${payloadTest.name}...`);
        const response = await axios.post(`${baseURL}${endpoint}`, payloadTest.payload, {
          headers,
          timeout: 10000
        });
        console.log(`      ✅ SUCCESS: ${response.status} - ${JSON.stringify(response.data)}`);
        workingPanConfig = { endpoint, payload: payloadTest };
        break;
      } catch (error) {
        console.log(`      ❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    if (workingPanConfig) break;
  }

  // Summary
  console.log('\n📊 SUMMARY OF WORKING CONFIGURATIONS:');
  console.log(`Base URL: ${baseURL}`);

  if (workingAadhaarConfig) {
    console.log(`✅ Aadhaar OTP: ${workingAadhaarConfig.endpoint}`);
    console.log(`   Payload: ${workingAadhaarConfig.payload.name}`);
  } else {
    console.log('❌ Aadhaar OTP: No working configuration found');
  }

  if (workingPanConfig) {
    console.log(`✅ PAN Verification: ${workingPanConfig.endpoint}`);
    console.log(`   Payload: ${workingPanConfig.payload.name}`);
  } else {
    console.log('❌ PAN Verification: No working configuration found');
  }
}

// Run the test
testAPIEndpoints().catch(console.error);
