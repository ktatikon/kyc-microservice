const axios = require('axios');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');
const redisManager = require('../../shared/redis');

class KYCService {
  constructor() {
    // IDfy API Configuration with CORRECT base URL and credentials
    this.baseURL = process.env.IDFY_BASE_URL || 'https://api.idfy.com';
    this.apiKey = process.env.IDFY_API_KEY || 'e443e8cc-47ca-47e8-b0f3-da146040dd59';
    this.accountId = process.env.IDFY_ACCOUNT_ID || 'ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc';
    this.username = process.env.IDFY_USERNAME || 'krishna.deepak@techivtta.in';
    this.password = process.env.IDFY_PASSWORD || 'hattyw-xudnyp-rAffe9';

    // IDfy API Headers Configuration (CORRECT format)
    this.headers = {
      'api-key': this.apiKey,
      'account-id': this.accountId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Basic Auth for additional authentication if needed
    this.basicAuth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    // Initialize axios instance with proper configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: this.headers,
      timeout: 30000, // 30 seconds timeout
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for request/response logging
   */
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug('IDfy API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: { ...config.headers, 'api-key': '[REDACTED]' }
        });
        return config;
      },
      (error) => {
        logger.error('IDfy API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('IDfy API Response', {
          status: response.status,
          url: response.config.url,
          dataKeys: Object.keys(response.data || {})
        });
        return response;
      },
      (error) => {
        logger.error('IDfy API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send Aadhaar OTP for verification using IDfy API
   * @param {string} aadhaarNumber - Aadhaar number (12 digits)
   * @param {string} userId - User ID for tracking
   * @returns {Object} OTP initiation response with task_id
   */
  async sendAadhaarOtp(aadhaarNumber, userId) {
    try {
      logger.kyc(userId, 'aadhaar_otp_init', 'started', {
        aadhaar: Utils.maskSensitiveData(aadhaarNumber)
      });

      // Validate Aadhaar format
      if (!Utils.validateAadhaarFormat(aadhaarNumber)) {
        throw new Error('Invalid Aadhaar number format');
      }

      // IDfy API payload for Aadhaar OTP initiation (CORRECTED FORMAT)
      const payload = {
        task_id: `aadhaar_otp_${Date.now()}_${userId}`,
        group_id: `group_${Date.now()}`,
        data: {
          aadhaar_number: aadhaarNumber,
          consent: 'Y',
          reason: 'KYC verification for DEX platform'
        }
      };

      // Call IDfy API endpoint for Aadhaar OTP initiation (TRY DIFFERENT ENDPOINT)
      // Note: Aadhaar endpoint pattern might be different, will test multiple patterns
      const possibleEndpoints = [
        '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
        '/v3/tasks/sync/verify_with_source/ind_aadhaar_otp',
        '/v3/tasks/async/verify_with_source/aadhaar_otp',
        '/v3/tasks/async/verify_with_source/ind_aadhaar'
      ];

      let response = null;
      let lastError = null;

      // Try different endpoints until one works
      for (const endpoint of possibleEndpoints) {
        try {
          response = await this.axiosInstance.post(endpoint, payload);
          logger.debug(`Aadhaar OTP endpoint found: ${endpoint}`);
          break;
        } catch (error) {
          lastError = error;
          if (error.response?.status !== 404) {
            // If it's not a 404, this might be the right endpoint with wrong payload
            break;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('No working Aadhaar OTP endpoint found');
      }

      // Handle API response
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`IDfy API returned status ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }

      const responseData = response.data;
      const taskId = responseData.request_id || payload.task_id;

      if (!taskId) {
        throw new Error('No task_id received from IDfy API');
      }

      // Store reference in Redis for tracking
      await redisManager.set(
        `kyc:aadhaar:${userId}:${taskId}`,
        {
          userId,
          aadhaarNumber: Utils.generateHash(aadhaarNumber), // Store hash only for security
          taskId,
          status: 'otp_sent',
          provider: 'idfy',
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
        },
        300 // 5 minutes expiry
      );

      // Also store a reverse lookup for the user
      await redisManager.set(
        `kyc:user:${userId}:current_aadhaar_task`,
        taskId,
        300 // 5 minutes expiry
      );

      logger.kyc(userId, 'aadhaar_otp_init', 'completed', {
        taskId,
        status: responseData.status || 'initiated'
      });

      return {
        success: true,
        taskId, // IDfy uses task_id instead of referenceId
        referenceId: taskId, // For backward compatibility
        message: 'OTP sent successfully to registered mobile number',
        data: {
          task_id: taskId,
          status: responseData.status || 'initiated',
          message: responseData.message || 'OTP sent successfully',
          provider: 'idfy'
        }
      };

    } catch (error) {
      logger.error('Aadhaar OTP initiation failed:', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to initiate Aadhaar OTP verification';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid Aadhaar number or request format';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed - Invalid API credentials';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded - Please try again later';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Verify Aadhaar OTP and get KYC data using IDfy API
   * @param {string} taskId - Task ID from OTP initiation (IDfy uses task_id)
   * @param {string} otp - OTP received by user (6 digits)
   * @param {string} userId - User ID for tracking
   * @returns {Object} Verification response with complete KYC data
   */
  async verifyAadhaarOtp(taskId, otp, userId) {
    try {
      logger.kyc(userId, 'aadhaar_otp_verify', 'started', { taskId });

      // Validate OTP format
      if (!otp || !/^\d{6}$/.test(otp)) {
        throw new Error('Invalid OTP format - must be 6 digits');
      }

      // Check if we have the task in Redis
      const taskData = await redisManager.get(`kyc:aadhaar:${userId}:${taskId}`);
      if (!taskData) {
        throw new Error('Invalid or expired task ID');
      }

      // IDfy API payload for OTP verification
      const payload = {
        task_id: taskId,
        code: otp
      };

      // Call IDfy API endpoint for OTP verification
      const response = await this.axiosInstance.post(
        '/v3/tasks/async/verify_with_source/ind_aadhaar_otp',
        payload
      );

      // Handle API response
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`IDfy API returned status ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }

      const responseData = response.data;

      // Check if verification was successful
      if (responseData.status !== 'completed' && responseData.status !== 'success') {
        throw new Error(responseData.message || 'OTP verification failed');
      }

      // Extract KYC data from response
      const kycData = responseData.result || responseData.data;
      if (!kycData) {
        throw new Error('No KYC data received from verification');
      }

      // Store verification result in Redis with extended expiry
      await redisManager.set(
        `kyc:aadhaar:${userId}:verified`,
        {
          userId,
          taskId,
          status: 'verified',
          verificationData: kycData,
          provider: 'idfy',
          timestamp: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        },
        86400 // 24 hours expiry
      );

      // Update the task status in Redis
      await redisManager.set(
        `kyc:aadhaar:${userId}:${taskId}`,
        {
          ...taskData,
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          kycData: kycData
        },
        86400 // Extend expiry to 24 hours
      );

      // Clear the current task reference
      await redisManager.del(`kyc:user:${userId}:current_aadhaar_task`);

      logger.kyc(userId, 'aadhaar_otp_verify', 'completed', {
        taskId,
        status: responseData.status,
        hasKycData: !!kycData
      });

      return {
        success: true,
        taskId,
        message: 'Aadhaar verification completed successfully',
        data: {
          status: responseData.status,
          task_id: taskId,
          verification_status: 'verified',
          provider: 'idfy'
        },
        kycData: {
          name: kycData.name_on_card || kycData.full_name,
          dateOfBirth: kycData.date_of_birth || kycData.dob,
          gender: kycData.gender,
          address: {
            line1: kycData.address?.house || kycData.care_of,
            line2: kycData.address?.street || kycData.house,
            city: kycData.address?.city || kycData.district,
            state: kycData.address?.state || kycData.state,
            pincode: kycData.address?.pincode || kycData.pin_code,
            country: 'India'
          },
          aadhaarNumber: Utils.maskSensitiveData(kycData.aadhaar_number || ''),
          verificationTimestamp: new Date().toISOString(),
          provider: 'idfy'
        }
      };

    } catch (error) {
      logger.error('Aadhaar OTP verification failed:', {
        userId,
        taskId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Provide more specific error messages
      let errorMessage = 'OTP verification failed';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid OTP or task ID';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed - Invalid API credentials';
      } else if (error.response?.status === 404) {
        errorMessage = 'Task not found or expired';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded - Please try again later';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Verify PAN number using IDfy API
   * @param {string} panNumber - PAN number (10 characters)
   * @param {string} userId - User ID for tracking
   * @returns {Object} PAN verification response
   */
  async verifyPAN(panNumber, userId) {
    try {
      logger.kyc(userId, 'pan_verify', 'started', {
        pan: Utils.maskSensitiveData(panNumber)
      });

      // Validate PAN format
      if (!Utils.validatePANFormat(panNumber)) {
        throw new Error('Invalid PAN number format');
      }

      // IDfy API payload for PAN verification (TESTING DIFFERENT FORMATS)
      // Based on testing, the current format returns "Malformed request"
      // Let's try different payload structures
      const payloadFormats = [
        // Format 1: Current format
        {
          task_id: `pan_verify_${Date.now()}_${userId}`,
          group_id: `group_${Date.now()}`,
          data: {
            id_number: panNumber.toUpperCase()
          }
        },
        // Format 2: Direct id_number (no nested data)
        {
          task_id: `pan_verify_${Date.now()}_${userId}`,
          group_id: `group_${Date.now()}`,
          id_number: panNumber.toUpperCase()
        },
        // Format 3: Minimal format
        {
          id_number: panNumber.toUpperCase()
        }
      ];

      let response = null;
      let lastError = null;

      // Try different payload formats until one works
      for (const payload of payloadFormats) {
        try {
          response = await this.axiosInstance.post(
            '/v3/tasks/sync/verify_with_source/ind_pan',
            payload
          );
          logger.debug(`PAN verification payload format found:`, payload);
          break;
        } catch (error) {
          lastError = error;
          // If we get a different error than "Malformed request", this might be progress
          if (error.response?.status !== 400 || !error.response?.data?.message?.includes('Malformed')) {
            break;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('No working PAN verification payload format found');
      }

      // Handle API response
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`IDfy API returned status ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }

      const responseData = response.data;
      const verificationData = responseData.result || responseData.data;

      // Store verification result
      await redisManager.set(
        `kyc:pan:${userId}`,
        {
          userId,
          panHash: Utils.generateHash(panNumber),
          status: 'verified',
          verificationData: verificationData,
          provider: 'idfy',
          timestamp: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        },
        86400 // 24 hours expiry
      );

      logger.kyc(userId, 'pan_verify', 'completed', {
        status: responseData.status,
        hasVerificationData: !!verificationData
      });

      return {
        success: true,
        message: 'PAN verification completed successfully',
        data: {
          status: responseData.status,
          verification_status: 'verified',
          provider: 'idfy'
        },
        verificationData: {
          panNumber: Utils.maskSensitiveData(panNumber),
          name: verificationData?.name || verificationData?.full_name,
          isValid: verificationData?.valid === true || responseData.status === 'completed',
          verificationTimestamp: new Date().toISOString(),
          provider: 'idfy'
        }
      };

    } catch (error) {
      logger.error('PAN verification failed:', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Provide more specific error messages
      let errorMessage = 'PAN verification failed';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid PAN number format';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed - Invalid API credentials';
      } else if (error.response?.status === 404) {
        errorMessage = 'PAN number not found in government database';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded - Please try again later';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Verify Passport using IDfy API
   * @param {string} passportNumber - Passport number
   * @param {string} dob - Date of birth (YYYY-MM-DD)
   * @param {string} userId - User ID for tracking
   * @returns {Object} Passport verification response
   */
  async verifyPassport(passportNumber, dob, userId) {
    try {
      logger.kyc(userId, 'passport_verify', 'started', {
        passport: Utils.maskSensitiveData(passportNumber)
      });

      // Validate passport format
      if (!Utils.validatePassportFormat(passportNumber)) {
        throw new Error('Invalid passport number format');
      }

      // Validate date format
      if (!Utils.validateDateFormat(dob)) {
        throw new Error('Invalid date of birth format');
      }

      // IDfy API payload for Passport verification (TESTING DIFFERENT FORMATS)
      const payloadFormats = [
        // Format 1: Current format
        {
          task_id: `passport_verify_${Date.now()}_${userId}`,
          group_id: `group_${Date.now()}`,
          data: {
            passport_number: passportNumber.toUpperCase(),
            date_of_birth: dob
          }
        },
        // Format 2: Direct fields (no nested data)
        {
          task_id: `passport_verify_${Date.now()}_${userId}`,
          group_id: `group_${Date.now()}`,
          passport_number: passportNumber.toUpperCase(),
          date_of_birth: dob
        },
        // Format 3: Minimal format
        {
          passport_number: passportNumber.toUpperCase(),
          date_of_birth: dob
        }
      ];

      let response = null;
      let lastError = null;

      // Try different payload formats until one works
      for (const payload of payloadFormats) {
        try {
          response = await this.axiosInstance.post(
            '/v3/tasks/sync/verify_with_source/ind_passport',
            payload
          );
          logger.debug(`Passport verification payload format found:`, payload);
          break;
        } catch (error) {
          lastError = error;
          // If we get a different error than "Malformed request", this might be progress
          if (error.response?.status !== 400 || !error.response?.data?.message?.includes('Malformed')) {
            break;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('No working Passport verification payload format found');
      }

      // Handle API response
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`IDfy API returned status ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }

      const responseData = response.data;
      const verificationData = responseData.result || responseData.data;

      // Store verification result
      await redisManager.set(
        `kyc:passport:${userId}`,
        {
          userId,
          passportHash: Utils.generateHash(passportNumber),
          status: 'verified',
          verificationData: verificationData,
          provider: 'idfy',
          timestamp: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        },
        86400 // 24 hours expiry
      );

      logger.kyc(userId, 'passport_verify', 'completed', {
        status: responseData.status,
        hasVerificationData: !!verificationData
      });

      return {
        success: true,
        message: 'Passport verification completed successfully',
        data: {
          status: responseData.status,
          verification_status: 'verified',
          provider: 'idfy'
        },
        verificationData: {
          passportNumber: Utils.maskSensitiveData(passportNumber),
          name: verificationData?.name || verificationData?.full_name,
          dateOfBirth: verificationData?.date_of_birth || dob,
          nationality: verificationData?.nationality || 'Indian',
          isValid: verificationData?.valid === true || responseData.status === 'completed',
          verificationTimestamp: new Date().toISOString(),
          provider: 'idfy'
        }
      };

    } catch (error) {
      logger.error('Passport verification failed:', {
        userId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Provide more specific error messages
      let errorMessage = 'Passport verification failed';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid passport number or date of birth';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed - Invalid API credentials';
      } else if (error.response?.status === 404) {
        errorMessage = 'Passport not found in government database';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded - Please try again later';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Get KYC status for a user
   * @param {string} userId - User ID
   * @returns {Object} KYC status
   */
  async getKYCStatus(userId) {
    try {
      const aadhaarStatus = await redisManager.get(`kyc:aadhaar:${userId}:*`);
      const panStatus = await redisManager.get(`kyc:pan:${userId}`);
      const passportStatus = await redisManager.get(`kyc:passport:${userId}`);

      return {
        userId,
        aadhaar: aadhaarStatus ? 'verified' : 'pending',
        pan: panStatus ? 'verified' : 'pending',
        passport: passportStatus ? 'verified' : 'pending',
        overallStatus: this.calculateOverallStatus(aadhaarStatus, panStatus, passportStatus),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting KYC status:', error);
      throw new Error('Failed to get KYC status');
    }
  }

  /**
   * Calculate overall KYC status
   * @param {Object} aadhaarStatus - Aadhaar verification status
   * @param {Object} panStatus - PAN verification status
   * @param {Object} passportStatus - Passport verification status
   * @returns {string} Overall status
   */
  calculateOverallStatus(aadhaarStatus, panStatus, passportStatus) {
    if (aadhaarStatus && panStatus) {
      return 'completed';
    } else if (aadhaarStatus || panStatus || passportStatus) {
      return 'partial';
    } else {
      return 'pending';
    }
  }

  /**
   * Get KYC progress for a user
   * @param {string} userId - User ID
   * @returns {Object} KYC progress
   */
  async getKYCProgress(userId) {
    try {
      const status = await this.getKYCStatus(userId);
      
      const progress = {
        userId,
        steps: {
          aadhaar: {
            completed: status.aadhaar === 'verified',
            required: true,
            description: 'Aadhaar verification with OTP'
          },
          pan: {
            completed: status.pan === 'verified',
            required: true,
            description: 'PAN card verification'
          },
          passport: {
            completed: status.passport === 'verified',
            required: false,
            description: 'Passport verification (optional)'
          }
        },
        completionPercentage: this.calculateCompletionPercentage(status),
        nextStep: this.getNextStep(status),
        overallStatus: status.overallStatus
      };

      return progress;

    } catch (error) {
      logger.error('Error getting KYC progress:', error);
      throw new Error('Failed to get KYC progress');
    }
  }

  /**
   * Calculate completion percentage
   * @param {Object} status - KYC status
   * @returns {number} Completion percentage
   */
  calculateCompletionPercentage(status) {
    let completed = 0;
    let total = 2; // Aadhaar and PAN are required

    if (status.aadhaar === 'verified') completed++;
    if (status.pan === 'verified') completed++;

    return Math.round((completed / total) * 100);
  }

  /**
   * Get next step in KYC process
   * @param {Object} status - KYC status
   * @returns {string} Next step
   */
  getNextStep(status) {
    if (status.aadhaar !== 'verified') {
      return 'aadhaar_verification';
    } else if (status.pan !== 'verified') {
      return 'pan_verification';
    } else {
      return 'completed';
    }
  }
}

module.exports = new KYCService();
