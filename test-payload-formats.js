#!/usr/bin/env node

/**
 * Test different payload formats to find the correct IDfy API format
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

async function testPayloadFormats() {
  console.log('🔍 Testing Different Payload Formats for IDfy API...');
  console.log(`Base URL: ${API_CONFIG.baseURL}`);
  console.log('');

  // Test PAN verification with different payload formats
  console.log('1️⃣ Testing PAN Verification Payload Formats...');
  
  const panFormats = [
    {
      name: 'Format 1: Standard IDfy with nested data',
      payload: {
        task_id: `pan_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: 'ABCDE1234F'
        }
      }
    },
    {
      name: 'Format 2: Direct id_number',
      payload: {
        task_id: `pan_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        id_number: 'ABCDE1234F'
      }
    },
    {
      name: 'Format 3: Source object',
      payload: {
        task_id: `pan_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        source: {
          id_number: 'ABCDE1234F'
        }
      }
    },
    {
      name: 'Format 4: Minimal with just id_number',
      payload: {
        id_number: 'ABCDE1234F'
      }
    },
    {
      name: 'Format 5: With consent and reason',
      payload: {
        task_id: `pan_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          id_number: 'ABCDE1234F',
          consent: 'Y',
          reason: 'KYC verification'
        }
      }
    },
    {
      name: 'Format 6: IDfy standard format (based on docs)',
      payload: {
        task_id: `pan_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          source: {
            id_number: 'ABCDE1234F'
          }
        }
      }
    }
  ];

  const panEndpoint = '/v3/tasks/sync/verify_with_source/ind_pan';
  
  for (const format of panFormats) {
    try {
      console.log(`\n   Testing ${format.name}...`);
      
      const response = await axios.post(`${API_CONFIG.baseURL}${panEndpoint}`, format.payload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // If successful, this is the correct format
      console.log(`   🎯 FOUND WORKING FORMAT: ${format.name}`);
      break;
      
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.log(`   ❌ Failed: Status ${status}`);
      console.log(`   Error: ${errorData?.message || error.message}`);
      
      // Show detailed error for analysis
      if (errorData && errorData.error !== 'BAD_REQUEST') {
        console.log(`   Details: ${JSON.stringify(errorData, null, 2)}`);
      }
    }
  }

  // Test Aadhaar OTP with different formats
  console.log('\n2️⃣ Testing Aadhaar OTP Payload Formats...');
  
  const aadhaarFormats = [
    {
      name: 'Format 1: Standard with nested data',
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
      name: 'Format 2: Source object',
      payload: {
        task_id: `aadhaar_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        source: {
          aadhaar: '234567890123'
        }
      }
    },
    {
      name: 'Format 3: Nested source in data',
      payload: {
        task_id: `aadhaar_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          source: {
            aadhaar: '234567890123'
          }
        }
      }
    },
    {
      name: 'Format 4: Direct aadhaar field',
      payload: {
        task_id: `aadhaar_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        aadhaar: '234567890123',
        consent: 'Y'
      }
    },
    {
      name: 'Format 5: Minimal format',
      payload: {
        aadhaar: '234567890123',
        consent: 'Y'
      }
    }
  ];

  const aadhaarEndpoint = '/v3/tasks/async/verify_with_source/ind_aadhaar_otp';
  
  for (const format of aadhaarFormats) {
    try {
      console.log(`\n   Testing ${format.name}...`);
      
      const response = await axios.post(`${API_CONFIG.baseURL}${aadhaarEndpoint}`, format.payload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // If successful, this is the correct format
      console.log(`   🎯 FOUND WORKING AADHAAR FORMAT: ${format.name}`);
      break;
      
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.log(`   ❌ Failed: Status ${status}`);
      console.log(`   Error: ${errorData?.message || error.message}`);
      
      // Show detailed error for analysis
      if (errorData && errorData.error !== 'BAD_REQUEST' && errorData.error !== 'NOT_FOUND') {
        console.log(`   Details: ${JSON.stringify(errorData, null, 2)}`);
      }
    }
  }

  // Test Passport verification
  console.log('\n3️⃣ Testing Passport Verification Payload Formats...');
  
  const passportFormats = [
    {
      name: 'Format 1: Standard with nested data',
      payload: {
        task_id: `passport_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          passport_number: 'A1234567',
          date_of_birth: '1990-01-01'
        }
      }
    },
    {
      name: 'Format 2: Source object',
      payload: {
        task_id: `passport_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        source: {
          passport_number: 'A1234567',
          date_of_birth: '1990-01-01'
        }
      }
    },
    {
      name: 'Format 3: Nested source in data',
      payload: {
        task_id: `passport_test_${Date.now()}`,
        group_id: `group_${Date.now()}`,
        data: {
          source: {
            passport_number: 'A1234567',
            date_of_birth: '1990-01-01'
          }
        }
      }
    }
  ];

  const passportEndpoint = '/v3/tasks/sync/verify_with_source/ind_passport';
  
  for (const format of passportFormats) {
    try {
      console.log(`\n   Testing ${format.name}...`);
      
      const response = await axios.post(`${API_CONFIG.baseURL}${passportEndpoint}`, format.payload, {
        headers: API_CONFIG.headers,
        timeout: 15000
      });
      
      console.log(`   ✅ SUCCESS: Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // If successful, this is the correct format
      console.log(`   🎯 FOUND WORKING PASSPORT FORMAT: ${format.name}`);
      break;
      
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.log(`   ❌ Failed: Status ${status}`);
      console.log(`   Error: ${errorData?.message || error.message}`);
      
      // Show detailed error for analysis
      if (errorData && errorData.error !== 'BAD_REQUEST') {
        console.log(`   Details: ${JSON.stringify(errorData, null, 2)}`);
      }
    }
  }

  console.log('\n🎯 Payload Format Testing Completed!');
}

testPayloadFormats().catch(console.error);
