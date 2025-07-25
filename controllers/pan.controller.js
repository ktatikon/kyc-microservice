const kycService = require('../services/kyc.service');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class PANController {
  /**
   * Verify PAN number
   */
  async verifyPAN(req, res) {
    try {
      const { panNumber, userId, name, dateOfBirth } = req.body;
      
      logger.kyc(userId, 'pan_verify', 'started', {
        pan: Utils.maskSensitiveData(panNumber)
      });
      
      const result = await kycService.verifyPAN(panNumber, userId);
      
      logger.kyc(userId, 'pan_verify', 'completed', {
        success: result.success
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('PAN verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify PAN number'
      });
    }
  }

  /**
   * Validate PAN format
   */
  async validatePANFormat(req, res) {
    try {
      const { panNumber } = req.body;
      
      const isValid = Utils.validatePANFormat(panNumber);
      
      res.json({
        success: true,
        data: {
          panNumber: Utils.maskSensitiveData(panNumber),
          isValid,
          message: isValid ? 'Valid PAN format' : 'Invalid PAN format'
        }
      });
      
    } catch (error) {
      logger.error('PAN validation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate PAN number'
      });
    }
  }

  /**
   * Get PAN verification status
   */
  async getPANStatus(req, res) {
    try {
      const { userId } = req.params;
      
      // For now, return sample status
      res.json({
        success: true,
        data: {
          userId,
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          panHash: 'sample_hash'
        }
      });
      
    } catch (error) {
      logger.error('Error getting PAN status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get PAN status'
      });
    }
  }

  /**
   * Retry PAN verification
   */
  async retryPANVerification(req, res) {
    try {
      const { panNumber, userId } = req.body;
      
      logger.kyc(userId, 'pan_retry', 'started');
      
      const result = await kycService.verifyPAN(panNumber, userId);
      
      logger.kyc(userId, 'pan_retry', 'completed', {
        success: result.success
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('PAN retry failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry PAN verification'
      });
    }
  }

  /**
   * Get PAN verification history
   */
  async getPANHistory(req, res) {
    try {
      const { userId } = req.params;
      
      // For now, return sample history
      res.json({
        success: true,
        data: {
          userId,
          history: [
            {
              id: Utils.generateReferenceId('PAN_HIST'),
              timestamp: new Date().toISOString(),
              status: 'verified',
              panHash: 'sample_hash'
            }
          ]
        }
      });
      
    } catch (error) {
      logger.error('Error getting PAN history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get PAN history'
      });
    }
  }
}

module.exports = new PANController();
