#!/usr/bin/env node

/**
 * Test POST requests on the working api.idfy.com endpoint
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  baseURL: 'https://api.idfy.com',
  apiKey: process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
  accountId: process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
  headers: {
    'api-key': process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
    'account-id': process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

async function testPOSTRequests() {
  console.log('🔍 Testing POST requests on api.idfy.com...');
  console.log(`Base URL: ${API_CONFIG.baseURL}`);
  console.log(`API Key: ${API_CONFIG.apiKey.substring(0, 8)}...`);
  console.log(`Account ID: ${API_CONFIG.accountId}`);
  console.log('');

  // Test 1: POST to /v3/tasks (the endpoint that returned 500 on GET)
  console.log('1️⃣ Testing POST /v3/tasks...');
  
  const taskPayloads = [
    {
      name: 'Minimal Task',
      payload: {
        task_id: `test_${Date.now()}`,
        group_id: `group_${Date.now()}`
      }
    },
    {
      name: 'Aadhaar OTP Task',
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
      name: 'Standard IDfy Format',
      payload: {
        task_id: `task_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: '234567890123'
        }
      }
    }
  ];

  for (const test of taskPayloads) {
    try {
      console.log(`\n   Testing ${test.name}...`);
      const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks`, test.payload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      console.log(`   ❌ Failed: Status ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }

  // Test 2: Try specific KYC endpoints with POST
  console.log('\n2️⃣ Testing specific KYC endpoints with POST...');
  
  const kycEndpoints = [
    {
      name: 'Aadhaar OTP Async',
      endpoint: '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
      payload: {
        task_id: `aadhaar_otp_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          aadhaar_number: '234567890123',
          consent: 'Y',
          reason: 'KYC verification'
        }
      }
    },
    {
      name: 'PAN Sync',
      endpoint: '/v3/tasks/sync/verify_with_source/ind_pan',
      payload: {
        task_id: `pan_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: 'ABCDE1234F'
        }
      }
    },
    {
      name: 'Passport Sync',
      endpoint: '/v3/tasks/sync/verify_with_source/ind_passport',
      payload: {
        task_id: `passport_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          passport_number: 'A1234567',
          date_of_birth: '1990-01-01'
        }
      }
    }
  ];

  for (const test of kycEndpoints) {
    try {
      console.log(`\n   Testing ${test.name}...`);
      console.log(`   Endpoint: ${test.endpoint}`);
      
      const response = await axios.post(`${API_CONFIG.baseURL}${test.endpoint}`, test.payload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // If this is Aadhaar OTP, save the task_id for verification testing
      if (test.name.includes('Aadhaar') && response.data?.request_id) {
        console.log(`   🔑 Task ID for OTP verification: ${response.data.request_id}`);
      }
      
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.log(`   ❌ ${test.name} Failed: Status ${status}`);
      console.log(`   Error: ${errorData?.message || error.message}`);
      
      if (errorData) {
        console.log(`   Details: ${JSON.stringify(errorData, null, 2)}`);
      }
      
      // Analyze the error to understand what's wrong
      if (status === 400) {
        console.log(`   💡 Bad Request - Check payload format`);
      } else if (status === 401) {
        console.log(`   💡 Unauthorized - Check API credentials`);
      } else if (status === 403) {
        console.log(`   💡 Forbidden - Check account permissions`);
      } else if (status === 422) {
        console.log(`   💡 Validation Error - Check required fields`);
      } else if (status === 500) {
        console.log(`   💡 Server Error - API might be having issues`);
      }
    }
  }

  // Test 3: Try alternative payload formats
  console.log('\n3️⃣ Testing alternative payload formats...');
  
  const alternativeFormats = [
    {
      name: 'Simple Source Format',
      endpoint: '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
      payload: {
        source: {
          aadhaar: '234567890123'
        }
      }
    },
    {
      name: 'Direct Data Format',
      endpoint: '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
      payload: {
        aadhaar_number: '234567890123',
        consent: 'Y'
      }
    },
    {
      name: 'Nested Data Format',
      endpoint: '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
      payload: {
        data: {
          source: {
            aadhaar: '234567890123'
          }
        }
      }
    }
  ];

  for (const test of alternativeFormats) {
    try {
      console.log(`\n   Testing ${test.name}...`);
      
      const response = await axios.post(`${API_CONFIG.baseURL}${test.endpoint}`, test.payload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
  }

  console.log('\n🎯 POST Request Testing Completed!');
}

testPOSTRequests().catch(console.error);
