#!/usr/bin/env node

/**
 * Detailed test of api.idfy.com since it returned 500 error
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  apiKey: process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
  accountId: process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
  username: process.env.IDFY_USERNAME || 'krishna.deepak@techivtta.in',
  password: process.env.IDFY_PASSWORD || 'hattyw-xudnyp-rAffe9'
};

async function testAPIIdfy() {
  console.log('🔍 Detailed Testing of api.idfy.com...');
  console.log(`API Key: ${API_CONFIG.apiKey.substring(0, 8)}...`);
  console.log(`Account ID: ${API_CONFIG.accountId}`);
  console.log('');

  const baseURL = 'https://api.idfy.com';
  
  // Test different authentication combinations
  const authMethods = [
    {
      name: 'api-key + account-id headers',
      headers: { 
        'api-key': API_CONFIG.apiKey,
        'account-id': API_CONFIG.accountId,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'X-API-Key + X-Account-ID',
      headers: { 
        'X-API-Key': API_CONFIG.apiKey,
        'X-Account-ID': API_CONFIG.accountId,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Authorization Bearer + Account-ID',
      headers: { 
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'account-id': API_CONFIG.accountId,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Basic Auth + API Key',
      headers: { 
        'Authorization': `Basic ${Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')}`,
        'api-key': API_CONFIG.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  ];

  // Test different endpoints
  const testEndpoints = [
    '/',
    '/health',
    '/status',
    '/ping',
    '/v1',
    '/v2',
    '/v3',
    '/v3/tasks',
    '/tasks',
    '/verify',
    '/api',
    '/api/v3',
    '/api/v3/tasks'
  ];

  console.log('🌐 Testing different endpoints and auth methods...');
  
  for (const authMethod of authMethods) {
    console.log(`\n🔐 Testing ${authMethod.name}:`);
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.get(`${baseURL}${endpoint}`, {
          headers: authMethod.headers,
          timeout: 10000,
          validateStatus: (status) => status < 600 // Accept all responses
        });
        
        const contentType = response.headers['content-type'] || '';
        const isJSON = contentType.includes('application/json');
        const isHTML = response.data?.toString().includes('<!DOCTYPE html>');
        
        console.log(`   ✅ ${endpoint}: Status ${response.status}`);
        console.log(`      Content-Type: ${contentType}`);
        
        if (isJSON) {
          console.log(`      JSON Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        } else if (!isHTML) {
          console.log(`      Response: ${response.data?.toString().substring(0, 200)}...`);
        } else {
          console.log(`      HTML Response (login page)`);
        }
        
        // If we get a good response, test KYC endpoints
        if (response.status === 200 && isJSON) {
          await testKYCEndpoints(baseURL, authMethod.headers);
          return; // Found working config
        }
        
      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        if (status === 500) {
          console.log(`   ⚠️  ${endpoint}: Server Error (500) - ${message}`);
          console.log(`      This might be the right endpoint with wrong request format`);
        } else if (status === 401) {
          console.log(`   🔐 ${endpoint}: Unauthorized (401) - ${message}`);
        } else if (status === 403) {
          console.log(`   🚫 ${endpoint}: Forbidden (403) - ${message}`);
        } else if (status === 404) {
          // Skip 404s
        } else if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
          console.log(`   ❌ ${endpoint}: ${status || error.code} - ${message}`);
        }
      }
    }
  }

  // Try some specific IDfy endpoint patterns based on common API structures
  console.log('\n🎯 Testing specific IDfy patterns...');
  
  const idfyPatterns = [
    '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/v3/tasks/sync/verify_with_source/ind_pan',
    '/v3/tasks/sync/verify_with_source/ind_passport',
    '/api/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/api/v3/tasks/sync/verify_with_source/ind_pan'
  ];
  
  // Use the most promising auth method (api-key + account-id that gave 500)
  const headers = {
    'api-key': API_CONFIG.apiKey,
    'account-id': API_CONFIG.accountId,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  for (const pattern of idfyPatterns) {
    try {
      console.log(`\n   Testing GET ${pattern}...`);
      const response = await axios.get(`${baseURL}${pattern}`, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 600
      });
      
      console.log(`   ✅ GET ${pattern}: Status ${response.status}`);
      console.log(`      Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      
    } catch (error) {
      const status = error.response?.status;
      if (status === 405) {
        console.log(`   📝 ${pattern}: Method not allowed (try POST)`);
        
        // Try POST with minimal payload
        try {
          const postResponse = await axios.post(`${baseURL}${pattern}`, {
            task_id: `test_${Date.now()}`,
            group_id: `group_${Date.now()}`,
            data: {}
          }, {
            headers,
            timeout: 10000,
            validateStatus: (status) => status < 600
          });
          
          console.log(`   ✅ POST ${pattern}: Status ${postResponse.status}`);
          console.log(`      Response: ${JSON.stringify(postResponse.data).substring(0, 200)}...`);
          
        } catch (postError) {
          console.log(`   ❌ POST ${pattern}: ${postError.response?.status} - ${postError.response?.data?.message || postError.message}`);
        }
      } else if (status) {
        console.log(`   ❌ ${pattern}: ${status} - ${error.response?.data?.message || error.message}`);
      }
    }
  }
}

async function testKYCEndpoints(baseURL, headers) {
  console.log('\n🔍 Testing KYC endpoints with working configuration...');
  
  const kycTests = [
    {
      name: 'Aadhaar OTP',
      endpoint: '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
      payload: {
        task_id: `aadhaar_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          aadhaar_number: '234567890123',
          consent: 'Y'
        }
      }
    }
  ];
  
  for (const test of kycTests) {
    try {
      const response = await axios.post(`${baseURL}${test.endpoint}`, test.payload, {
        headers,
        timeout: 15000
      });
      
      console.log(`✅ ${test.name} SUCCESS: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      console.log(`❌ ${test.name} Failed: ${error.response?.status}`);
      console.log(`   Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
  }
}

testAPIIdfy().catch(console.error);
