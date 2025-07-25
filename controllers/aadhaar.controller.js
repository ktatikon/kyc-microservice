const kycService = require('../services/kyc.service');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class AadhaarController {
  /**
   * Initiate Aadhaar OTP verification
   */
  async initiateOTP(req, res) {
    try {
      const { aadhaarNumber, userId, consent } = req.body;
      
      logger.kyc(userId, 'aadhaar_otp_init', 'started');
      
      const result = await kycService.sendAadhaarOtp(aadhaarNumber, userId);
      
      logger.kyc(userId, 'aadhaar_otp_init', 'completed', {
        referenceId: result.referenceId
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Aadhaar OTP initiation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate Aadhaar OTP verification'
      });
    }
  }

  /**
   * Verify Aadhaar OTP
   */
  async verifyOTP(req, res) {
    try {
      const { referenceId, taskId, otp, userId } = req.body;

      // Support both referenceId (legacy) and taskId (IDfy standard)
      const actualTaskId = taskId || referenceId;

      logger.kyc(userId, 'aadhaar_otp_verify', 'started', {
        taskId: actualTaskId,
        referenceId: actualTaskId // For backward compatibility
      });

      const result = await kycService.verifyAadhaarOtp(actualTaskId, otp, userId);

      logger.kyc(userId, 'aadhaar_otp_verify', 'completed', {
        taskId: actualTaskId,
        referenceId: actualTaskId, // For backward compatibility
        success: result.success
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Aadhaar OTP verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Aadhaar OTP'
      });
    }
  }

  /**
   * Resend Aadhaar OTP
   */
  async resendOTP(req, res) {
    try {
      const { referenceId, userId } = req.body;
      
      logger.kyc(userId, 'aadhaar_otp_resend', 'started', { referenceId });
      
      // For now, return success - implement actual resend logic
      res.json({
        success: true,
        message: 'OTP resent successfully',
        data: { referenceId }
      });
      
    } catch (error) {
      logger.error('Aadhaar OTP resend failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resend Aadhaar OTP'
      });
    }
  }

  /**
   * Initiate biometric verification
   */
  async initiateBiometric(req, res) {
    try {
      const { aadhaarNumber, userId, biometricType, consent } = req.body;
      
      logger.kyc(userId, 'aadhaar_biometric_init', 'started', { biometricType });
      
      // For now, return success - implement actual biometric logic
      res.json({
        success: true,
        message: 'Biometric verification initiated',
        data: {
          referenceId: Utils.generateReferenceId('BIO'),
          biometricType,
          status: 'initiated'
        }
      });
      
    } catch (error) {
      logger.error('Aadhaar biometric initiation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate biometric verification'
      });
    }
  }

  /**
   * Verify biometric data
   */
  async verifyBiometric(req, res) {
    try {
      const { referenceId, biometricData, userId } = req.body;
      
      logger.kyc(userId, 'aadhaar_biometric_verify', 'started', { referenceId });
      
      // For now, return success - implement actual biometric verification
      res.json({
        success: true,
        message: 'Biometric verification completed',
        data: {
          referenceId,
          status: 'verified',
          confidence: 0.95
        }
      });
      
    } catch (error) {
      logger.error('Aadhaar biometric verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify biometric data'
      });
    }
  }

  /**
   * Scan QR code
   */
  async scanQR(req, res) {
    try {
      const { qrData, userId } = req.body;
      
      logger.kyc(userId, 'aadhaar_qr_scan', 'started');
      
      // For now, return success - implement actual QR scanning logic
      res.json({
        success: true,
        message: 'QR code processed successfully',
        data: {
          status: 'processed',
          extractedData: 'Sample extracted data'
        }
      });
      
    } catch (error) {
      logger.error('Aadhaar QR scanning failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process QR code'
      });
    }
  }

  /**
   * Upload offline XML
   */
  async uploadOfflineXML(req, res) {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No XML file uploaded'
        });
      }
      
      // For now, return success - implement actual XML processing
      res.json({
        success: true,
        message: 'Offline XML uploaded successfully',
        data: {
          fileId: Utils.generateReferenceId('XML'),
          status: 'uploaded'
        }
      });
      
    } catch (error) {
      logger.error('Offline XML upload failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload offline XML'
      });
    }
  }

  /**
   * Verify offline XML
   */
  async verifyOfflineXML(req, res) {
    try {
      const { xmlData, shareCode, userId } = req.body;
      
      logger.kyc(userId, 'aadhaar_offline_verify', 'started');
      
      // For now, return success - implement actual offline verification
      res.json({
        success: true,
        message: 'Offline XML verified successfully',
        data: {
          status: 'verified',
          kycData: 'Sample KYC data'
        }
      });
      
    } catch (error) {
      logger.error('Offline XML verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify offline XML'
      });
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(req, res) {
    try {
      const { referenceId } = req.params;
      
      // For now, return sample status
      res.json({
        success: true,
        data: {
          referenceId,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Error getting verification status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification status'
      });
    }
  }

  /**
   * Validate Aadhaar number
   */
  async validateAadhaarNumber(req, res) {
    try {
      const { aadhaarNumber } = req.body;
      
      const isValid = Utils.validateAadhaarFormat(aadhaarNumber);
      
      res.json({
        success: true,
        data: {
          aadhaarNumber: Utils.maskSensitiveData(aadhaarNumber),
          isValid,
          message: isValid ? 'Valid Aadhaar format' : 'Invalid Aadhaar format'
        }
      });
      
    } catch (error) {
      logger.error('Aadhaar validation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate Aadhaar number'
      });
    }
  }

  /**
   * Get consent status
   */
  async getConsentStatus(req, res) {
    try {
      const { userId } = req.params;
      
      // For now, return sample consent status
      res.json({
        success: true,
        data: {
          userId,
          consentGranted: true,
          consentTimestamp: new Date().toISOString(),
          consentType: 'otp'
        }
      });
      
    } catch (error) {
      logger.error('Error getting consent status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get consent status'
      });
    }
  }

  /**
   * Grant consent
   */
  async grantConsent(req, res) {
    try {
      const { userId, consentType, purpose, timestamp } = req.body;
      
      logger.kyc(userId, 'aadhaar_consent_grant', 'completed', {
        consentType,
        purpose
      });
      
      res.json({
        success: true,
        data: {
          userId,
          consentId: Utils.generateReferenceId('CONSENT'),
          status: 'granted',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Consent granting failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to grant consent'
      });
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(req, res) {
    try {
      const { userId, consentId, reason } = req.body;
      
      logger.kyc(userId, 'aadhaar_consent_revoke', 'completed', {
        consentId,
        reason
      });
      
      res.json({
        success: true,
        data: {
          userId,
          consentId,
          status: 'revoked',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Consent revocation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke consent'
      });
    }
  }
}

module.exports = new AadhaarController();
