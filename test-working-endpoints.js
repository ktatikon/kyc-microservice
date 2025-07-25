#!/usr/bin/env node

/**
 * Test the working IDfy endpoints to understand API structure
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  baseURL: 'https://apicentral.idfy.com',
  apiKey: process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
  headers: {
    'X-API-Key': process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
    'Content-Type': 'application/json'
  }
};

async function testWorkingEndpoints() {
  console.log('🔍 Testing Working IDfy Endpoints...');
  console.log(`Base URL: ${API_CONFIG.baseURL}`);
  console.log(`API Key: ${API_CONFIG.apiKey.substring(0, 8)}...`);
  console.log('');

  // Test 1: Get information from /verify endpoint
  try {
    console.log('1️⃣ Testing /verify endpoint...');
    const verifyResponse = await axios.get(`${API_CONFIG.baseURL}/verify`, {
      headers: API_CONFIG.headers
    });
    console.log('✅ /verify Response:');
    console.log(`   Status: ${verifyResponse.status}`);
    console.log(`   Data: ${JSON.stringify(verifyResponse.data, null, 2)}`);
  } catch (error) {
    console.log('❌ /verify failed:', error.response?.status, error.response?.data);
  }

  // Test 2: Get information from /v3/tasks endpoint
  try {
    console.log('\n2️⃣ Testing /v3/tasks endpoint...');
    const tasksResponse = await axios.get(`${API_CONFIG.baseURL}/v3/tasks`, {
      headers: API_CONFIG.headers
    });
    console.log('✅ /v3/tasks Response:');
    console.log(`   Status: ${tasksResponse.status}`);
    console.log(`   Data: ${JSON.stringify(tasksResponse.data, null, 2)}`);
  } catch (error) {
    console.log('❌ /v3/tasks failed:', error.response?.status, error.response?.data);
  }

  // Test 3: Try POST requests to see what endpoints accept
  console.log('\n3️⃣ Testing POST requests...');
  
  const testPayloads = [
    {
      name: 'Aadhaar OTP Test',
      endpoint: '/verify',
      payload: {
        task_id: `aadhaar_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          aadhaar_number: '234567890123',
          consent: 'Y'
        }
      }
    },
    {
      name: 'PAN Verification Test',
      endpoint: '/verify',
      payload: {
        task_id: `pan_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: 'ABCDE1234F'
        }
      }
    }
  ];

  for (const test of testPayloads) {
    try {
      console.log(`\n   Testing ${test.name} on ${test.endpoint}...`);
      const response = await axios.post(`${API_CONFIG.baseURL}${test.endpoint}`, test.payload, {
        headers: API_CONFIG.headers
      });
      console.log(`   ✅ SUCCESS: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log(`   Error Details: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }

  // Test 4: Try different endpoint patterns
  console.log('\n4️⃣ Testing different endpoint patterns...');
  
  const endpointPatterns = [
    '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/verify/aadhaar',
    '/verify/pan',
    '/verify/passport',
    '/aadhaar/otp',
    '/pan/verify',
    '/passport/verify'
  ];

  for (const endpoint of endpointPatterns) {
    try {
      console.log(`\n   Testing GET ${endpoint}...`);
      const response = await axios.get(`${API_CONFIG.baseURL}${endpoint}`, {
        headers: API_CONFIG.headers,
        validateStatus: (status) => status < 500
      });
      console.log(`   ✅ ${endpoint}: Status ${response.status}`);
      if (response.data && typeof response.data === 'object') {
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
    } catch (error) {
      if (error.response?.status === 405) {
        console.log(`   📝 ${endpoint}: Method not allowed (try POST)`);
        
        // Try POST if GET is not allowed
        try {
          const postResponse = await axios.post(`${API_CONFIG.baseURL}${endpoint}`, {
            task_id: `test_${Date.now()}`,
            data: { test: true }
          }, {
            headers: API_CONFIG.headers,
            validateStatus: (status) => status < 500
          });
          console.log(`   ✅ POST ${endpoint}: Status ${postResponse.status}`);
        } catch (postError) {
          console.log(`   ❌ POST ${endpoint}: ${postError.response?.status}`);
        }
      }
    }
  }

  console.log('\n🎯 Test completed!');
}

testWorkingEndpoints().catch(console.error);
