#!/usr/bin/env node

/**
 * Test minimal payload formats to find what IDfy expects
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

async function testMinimalPayloads() {
  console.log('🔍 Testing Minimal Payload Formats...');
  console.log(`Base URL: ${API_CONFIG.baseURL}`);
  console.log('');

  // Test 1: Absolute minimal PAN payload
  console.log('1️⃣ Testing Minimal PAN Payload...');
  
  const minimalPanPayload = {
    id_number: 'ABCDE1234F'
  };

  try {
    console.log('   Testing absolute minimal PAN format...');
    console.log(`   Payload: ${JSON.stringify(minimalPanPayload, null, 2)}`);
    
    const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks/sync/verify_with_source/ind_pan`, minimalPanPayload, {
      headers: API_CONFIG.headers,
      timeout: 15000
    });
    
    console.log(`   ✅ SUCCESS: Status ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log(`   ❌ Failed: Status ${status}`);
    console.log(`   Error: ${errorData?.message || error.message}`);
    
    if (errorData) {
      console.log(`   Full Response: ${JSON.stringify(errorData, null, 2)}`);
    }
  }

  await delay(5000);

  // Test 2: Try with just task_id and id_number
  console.log('\n2️⃣ Testing PAN with task_id only...');
  
  const taskIdPanPayload = {
    task_id: `pan_minimal_${Date.now()}`,
    id_number: 'ABCDE1234F'
  };

  try {
    console.log('   Testing PAN with task_id...');
    console.log(`   Payload: ${JSON.stringify(taskIdPanPayload, null, 2)}`);
    
    const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks/sync/verify_with_source/ind_pan`, taskIdPanPayload, {
      headers: API_CONFIG.headers,
      timeout: 15000
    });
    
    console.log(`   ✅ SUCCESS: Status ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log(`   ❌ Failed: Status ${status}`);
    console.log(`   Error: ${errorData?.message || error.message}`);
    
    if (errorData) {
      console.log(`   Full Response: ${JSON.stringify(errorData, null, 2)}`);
    }
  }

  await delay(5000);

  // Test 3: Try a completely different structure based on common API patterns
  console.log('\n3️⃣ Testing Alternative Structure...');
  
  const altPanPayload = {
    source: 'ind_pan',
    id_number: 'ABCDE1234F'
  };

  try {
    console.log('   Testing alternative structure...');
    console.log(`   Payload: ${JSON.stringify(altPanPayload, null, 2)}`);
    
    const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks/sync/verify_with_source/ind_pan`, altPanPayload, {
      headers: API_CONFIG.headers,
      timeout: 15000
    });
    
    console.log(`   ✅ SUCCESS: Status ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log(`   ❌ Failed: Status ${status}`);
    console.log(`   Error: ${errorData?.message || error.message}`);
    
    if (errorData) {
      console.log(`   Full Response: ${JSON.stringify(errorData, null, 2)}`);
    }
  }

  await delay(5000);

  // Test 4: Try with different field name
  console.log('\n4️⃣ Testing Different Field Names...');
  
  const diffFieldPayload = {
    pan: 'ABCDE1234F'
  };

  try {
    console.log('   Testing with "pan" field name...');
    console.log(`   Payload: ${JSON.stringify(diffFieldPayload, null, 2)}`);
    
    const response = await axios.post(`${API_CONFIG.baseURL}/v3/tasks/sync/verify_with_source/ind_pan`, diffFieldPayload, {
      headers: API_CONFIG.headers,
      timeout: 15000
    });
    
    console.log(`   ✅ SUCCESS: Status ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.log(`   ❌ Failed: Status ${status}`);
    console.log(`   Error: ${errorData?.message || error.message}`);
    
    if (errorData) {
      console.log(`   Full Response: ${JSON.stringify(errorData, null, 2)}`);
    }
  }

  console.log('\n🎯 Minimal Payload Testing Completed!');
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Check IDfy documentation for exact payload format');
  console.log('   2. Contact IDfy support for API specification');
  console.log('   3. Try different API versions (v1, v2 instead of v3)');
  console.log('   4. Verify if account has access to these specific endpoints');
}

testMinimalPayloads().catch(console.error);
