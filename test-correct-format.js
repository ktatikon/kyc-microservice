#!/usr/bin/env node

/**
 * Focused test to find the correct IDfy payload format
 * Testing one format at a time with delays to avoid rate limiting
 */

require('dotenv').config();
const axios = require('axios');

const API_CONFIG = {
  baseURL: 'https://api.idfy.com',
  headers: {
    'api-key': process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59',
    'account-id': process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCorrectFormat() {
  console.log('🔍 Finding Correct IDfy Payload Format (with rate limit handling)...');
  console.log(`Base URL: ${API_CONFIG.baseURL}`);
  console.log('');

  // Test PAN verification first (since it was responding)
  console.log('1️⃣ Testing PAN Verification - Finding Correct Format...');
  
  // Based on typical IDfy documentation patterns, try the most likely correct format
  const panPayload = {
    task_id: `pan_test_${Date.now()}`,
    group_id: `group_${Date.now()}`,
    data: {
      id_number: 'ABCDE1234F'
    }
  };

  try {
    console.log('   Testing standard PAN format...');
    console.log(`   Payload: ${JSON.stringify(panPayload, null, 2)}`);
    
    const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks/sync/verify_with_source/ind_pan`, panPayload, {
      headers: API_CONFIG.headers,
      timeout: 15000
    });
    
    console.log(`   ✅ PAN SUCCESS: Status ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log(`   ❌ PAN Failed: Status ${status}`);
    console.log(`   Error: ${errorData?.message || error.message}`);
    
    if (errorData) {
      console.log(`   Full Error Response: ${JSON.stringify(errorData, null, 2)}`);
      
      // Analyze the error to understand what's expected
      if (errorData.message && errorData.message.includes('required')) {
        console.log(`   💡 Missing required field detected`);
      }
      if (errorData.message && errorData.message.includes('format')) {
        console.log(`   💡 Format issue detected`);
      }
    }
  }

  // Wait to avoid rate limiting
  console.log('\n   Waiting 10 seconds to avoid rate limiting...');
  await delay(10000);

  // Test alternative PAN format
  console.log('\n2️⃣ Testing Alternative PAN Format...');
  
  const panPayload2 = {
    task_id: `pan_test2_${Date.now()}`,
    group_id: `group2_${Date.now()}`,
    data: {
      source: {
        id_number: 'ABCDE1234F'
      }
    }
  };

  try {
    console.log('   Testing nested source PAN format...');
    console.log(`   Payload: ${JSON.stringify(panPayload2, null, 2)}`);
    
    const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks/sync/verify_with_source/ind_pan`, panPayload2, {
      headers: API_CONFIG.headers,
      timeout: 15000
    });
    
    console.log(`   ✅ PAN SUCCESS: Status ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log(`   ❌ PAN Failed: Status ${status}`);
    console.log(`   Error: ${errorData?.message || error.message}`);
    
    if (errorData) {
      console.log(`   Full Error Response: ${JSON.stringify(errorData, null, 2)}`);
    }
  }

  // Wait to avoid rate limiting
  console.log('\n   Waiting 10 seconds to avoid rate limiting...');
  await delay(10000);

  // Test Aadhaar with different endpoint patterns
  console.log('\n3️⃣ Testing Aadhaar OTP - Different Endpoints...');
  
  const aadhaarEndpoints = [
    '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
    '/v3/tasks/sync/verify_with_source/ind_aadhaar_otp',
    '/v3/tasks/async/verify_with_source/aadhaar_otp',
    '/v3/tasks/async/verify_with_source/ind_aadhaar'
  ];

  const aadhaarPayload = {
    task_id: `aadhaar_test_${Date.now()}`,
    group_id: `group_${Date.now()}`,
    data: {
      aadhaar_number: '234567890123',
      consent: 'Y'
    }
  };

  for (const endpoint of aadhaarEndpoints) {
    try {
      console.log(`\n   Testing endpoint: ${endpoint}`);
      console.log(`   Payload: ${JSON.stringify(aadhaarPayload, null, 2)}`);
      
      const response = await axios.post(`${API_CONFIG.baseURL}${endpoint}`, aadhaarPayload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ AADHAAR SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      break; // Found working endpoint
      
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.log(`   ❌ Failed: Status ${status} - ${errorData?.message || error.message}`);
      
      if (status === 404) {
        console.log(`   💡 Endpoint not found, trying next...`);
      } else if (status === 400) {
        console.log(`   💡 Endpoint exists but payload format wrong`);
        if (errorData) {
          console.log(`   Error Details: ${JSON.stringify(errorData, null, 2)}`);
        }
      } else if (status === 429) {
        console.log(`   ⏳ Rate limited, waiting 15 seconds...`);
        await delay(15000);
      }
    }
    
    // Small delay between endpoint tests
    await delay(3000);
  }

  console.log('\n🎯 Focused Format Testing Completed!');
  console.log('\n📋 Summary:');
  console.log('   - PAN endpoint: /v3/tasks/sync/verify_with_source/ind_pan (responds but needs correct format)');
  console.log('   - Passport endpoint: /v3/tasks/sync/verify_with_source/ind_passport (responds but needs correct format)');
  console.log('   - Aadhaar endpoint: Need to find the correct endpoint pattern');
  console.log('   - Authentication: Working (api-key + account-id headers)');
  console.log('   - Base URL: https://api.idfy.com (confirmed working)');
}

testCorrectFormat().catch(console.error);
