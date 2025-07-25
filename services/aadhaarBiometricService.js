const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class AadhaarBiometricService {
  constructor() {
    this.baseURL = process.env.IDFY_BASE_URL || 'https://apicentral.idfy.com';
    this.apiKey = process.env.IDFY_API_KEY;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'account-id': process.env.IDFY_ACCOUNT_ID
    };
    
    // UIDAI-compliant biometric parameters
    this.biometricConfig = {
      fingerprint: {
        minQuality: 60,
        timeout: 10000,
        maxAttempts: 3,
        supportedFormats: ['ISO_19794_2', 'ANSI_378']
      },
      iris: {
        minQuality: 70,
        timeout: 15000,
        maxAttempts: 2,
        supportedFormats: ['ISO_19794_6']
      },
      face: {
        minQuality: 65,
        timeout: 8000,
        maxAttempts: 3,
        supportedFormats: ['ISO_19794_5']
      }
    };
  }

  /**
   * Initiate Aadhaar biometric verification
   */
  async initiateBiometricVerification(aadhaarNumber, biometricType, userId) {
    try {
      logger.kyc(userId, 'aadhaar_biometric_initiate', 'started', { 
        biometricType,
        aadhaar: Utils.maskAadhaar(aadhaarNumber)
      });

      // Validate biometric type
      if (!['fingerprint', 'iris', 'face'].includes(biometricType)) {
        throw new Error('Invalid biometric type. Supported: fingerprint, iris, face');
      }

      // Generate session for biometric capture
      const sessionId = Utils.generateReferenceId('BIO_SESSION');
      const transactionId = Utils.generateReferenceId('BIO_TXN');

      // For development, return mock session data
      // In production, this would call actual UIDAI/IDfy biometric APIs
      const mockResponse = {
        success: true,
        sessionId,
        transactionId,
        biometricType,
        config: this.biometricConfig[biometricType],
        instructions: this.getBiometricInstructions(biometricType),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        captureUrl: `${this.baseURL}/v3/tasks/sync/aadhaar/biometric/capture`,
        verifyUrl: `${this.baseURL}/v3/tasks/sync/aadhaar/biometric/verify`
      };

      logger.kyc(userId, 'aadhaar_biometric_initiate', 'completed', {
        sessionId,
        biometricType
      });

      return mockResponse;

    } catch (error) {
      logger.error('Aadhaar biometric initiation failed:', error);
      throw error;
    }
  }

  /**
   * Capture biometric data
   */
  async captureBiometricData(sessionId, biometricData, userId) {
    try {
      logger.kyc(userId, 'biometric_capture', 'started', { sessionId });

      // Validate biometric data format
      const validation = this.validateBiometricData(biometricData);
      if (!validation.isValid) {
        throw new Error(`Invalid biometric data: ${validation.errors.join(', ')}`);
      }

      // Encrypt biometric data for secure transmission
      const encryptedBiometric = this.encryptBiometricData(biometricData);

      // For development, simulate biometric capture
      await this.simulateProcessingDelay(2000);

      const captureResult = {
        success: true,
        sessionId,
        captureId: Utils.generateReferenceId('BIO_CAPTURE'),
        quality: {
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          threshold: this.biometricConfig[biometricData.type].minQuality
        },
        template: {
          format: biometricData.format,
          size: biometricData.template?.length || 0,
          encrypted: true
        },
        timestamp: new Date().toISOString()
      };

      // Check quality threshold
      if (captureResult.quality.score < captureResult.quality.threshold) {
        throw new Error(`Biometric quality too low: ${captureResult.quality.score}. Minimum required: ${captureResult.quality.threshold}`);
      }

      logger.kyc(userId, 'biometric_capture', 'completed', {
        sessionId,
        quality: captureResult.quality.score
      });

      return captureResult;

    } catch (error) {
      logger.error('Biometric capture failed:', error);
      throw error;
    }
  }

  /**
   * Verify biometric data against Aadhaar
   */
  async verifyBiometric(sessionId, captureId, aadhaarNumber, userId) {
    try {
      logger.kyc(userId, 'biometric_verify', 'started', { 
        sessionId,
        captureId,
        aadhaar: Utils.maskAadhaar(aadhaarNumber)
      });

      // For development, simulate UIDAI biometric verification
      await this.simulateProcessingDelay(5000);

      // Mock verification result
      const verificationResult = {
        success: true,
        verified: true,
        matchScore: Math.floor(Math.random() * 30) + 70, // 70-100
        threshold: 75,
        sessionId,
        captureId,
        transactionId: Utils.generateReferenceId('BIO_VERIFY'),
        
        // KYC data extracted from UIDAI
        kycData: {
          name: 'JOHN DOE',
          dateOfBirth: '01-01-1990',
          gender: 'M',
          address: {
            careOf: 'S/O FATHER NAME',
            house: '123',
            street: 'SAMPLE STREET',
            landmark: 'NEAR LANDMARK',
            locality: 'SAMPLE LOCALITY',
            vtc: 'SAMPLE CITY',
            district: 'SAMPLE DISTRICT',
            state: 'SAMPLE STATE',
            country: 'India',
            pincode: '123456'
          },
          photo: null // Base64 encoded photo would be here in production
        },
        
        // Verification metadata
        verificationMethod: 'biometric',
        uidaiResponse: {
          status: 'SUCCESS',
          errorCode: null,
          timestamp: new Date().toISOString()
        },
        
        timestamp: new Date().toISOString()
      };

      // Check match score threshold
      if (verificationResult.matchScore < verificationResult.threshold) {
        verificationResult.verified = false;
        verificationResult.error = `Biometric match score too low: ${verificationResult.matchScore}`;
      }

      logger.kyc(userId, 'biometric_verify', 'completed', {
        verified: verificationResult.verified,
        matchScore: verificationResult.matchScore
      });

      return verificationResult;

    } catch (error) {
      logger.error('Biometric verification failed:', error);
      throw error;
    }
  }

  /**
   * Get biometric device information
   */
  async getBiometricDeviceInfo(deviceId) {
    try {
      // Mock device information
      const deviceInfo = {
        deviceId,
        manufacturer: 'Sample Biometric Devices Ltd',
        model: 'SBD-FP-2024',
        serialNumber: 'SBD123456789',
        firmwareVersion: '2.1.5',
        
        capabilities: {
          fingerprint: {
            supported: true,
            sensors: 1,
            resolution: '500 DPI',
            imageFormat: ['WSQ', 'PNG', 'BMP']
          },
          iris: {
            supported: false
          },
          face: {
            supported: true,
            resolution: '640x480',
            imageFormat: ['JPEG', 'PNG']
          }
        },
        
        certification: {
          uidai: true,
          stqc: true,
          certificationNumber: 'STQC/UIDAI/2024/001',
          validUntil: '2025-12-31'
        },
        
        status: 'active',
        lastCalibrated: '2024-01-15T10:30:00Z',
        nextCalibrationDue: '2024-07-15T10:30:00Z'
      };

      return deviceInfo;

    } catch (error) {
      logger.error('Error getting device info:', error);
      throw error;
    }
  }

  /**
   * Validate biometric data format and quality
   */
  validateBiometricData(biometricData) {
    const errors = [];
    
    // Check required fields
    if (!biometricData.type) {
      errors.push('Biometric type is required');
    }
    
    if (!biometricData.template) {
      errors.push('Biometric template is required');
    }
    
    if (!biometricData.format) {
      errors.push('Biometric format is required');
    }
    
    // Validate biometric type
    if (biometricData.type && !['fingerprint', 'iris', 'face'].includes(biometricData.type)) {
      errors.push('Invalid biometric type');
    }
    
    // Validate format for specific biometric type
    if (biometricData.type && biometricData.format) {
      const supportedFormats = this.biometricConfig[biometricData.type]?.supportedFormats || [];
      if (!supportedFormats.includes(biometricData.format)) {
        errors.push(`Unsupported format for ${biometricData.type}: ${biometricData.format}`);
      }
    }
    
    // Validate template size
    if (biometricData.template && biometricData.template.length < 100) {
      errors.push('Biometric template too small');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Encrypt biometric data for secure transmission
   */
  encryptBiometricData(biometricData) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(process.env.BIOMETRIC_ENCRYPTION_KEY || 'default-key', 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from('biometric-data'));
      
      let encrypted = cipher.update(JSON.stringify(biometricData), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
      };
      
    } catch (error) {
      logger.error('Biometric encryption failed:', error);
      throw new Error('Failed to encrypt biometric data');
    }
  }

  /**
   * Get biometric capture instructions
   */
  getBiometricInstructions(biometricType) {
    const instructions = {
      fingerprint: [
        'Place your finger firmly on the scanner',
        'Keep finger steady until capture is complete',
        'Ensure finger is clean and dry',
        'Use the same finger for all attempts'
      ],
      iris: [
        'Look directly into the iris scanner',
        'Keep eyes open and steady',
        'Remove glasses if wearing any',
        'Maintain distance of 6-8 inches from scanner'
      ],
      face: [
        'Look directly at the camera',
        'Keep face within the frame',
        'Ensure good lighting',
        'Remove any face coverings'
      ]
    };
    
    return instructions[biometricType] || [];
  }

  /**
   * Simulate processing delay for development
   */
  async simulateProcessingDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get biometric verification history
   */
  async getBiometricHistory(userId, limit = 10) {
    try {
      // Mock history data
      const history = [
        {
          id: Utils.generateReferenceId('BIO_HIST'),
          userId,
          biometricType: 'fingerprint',
          verified: true,
          matchScore: 85,
          timestamp: new Date().toISOString(),
          deviceId: 'SBD123456789'
        }
      ];
      
      return {
        success: true,
        history: history.slice(0, limit),
        total: history.length
      };
      
    } catch (error) {
      logger.error('Error getting biometric history:', error);
      throw error;
    }
  }

  /**
   * Health check for biometric service
   */
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        biometricTypes: Object.keys(this.biometricConfig),
        apiConnection: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new AadhaarBiometricService();
