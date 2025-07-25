const kycService = require('../services/kyc.service');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class PassportController {
  /**
   * Verify passport
   */
  async verifyPassport(req, res) {
    try {
      const { passportNumber, dateOfBirth, userId, name, nationality } = req.body;
      
      logger.kyc(userId, 'passport_verify', 'started', {
        passport: Utils.maskSensitiveData(passportNumber)
      });
      
      const result = await kycService.verifyPassport(passportNumber, dateOfBirth, userId);
      
      logger.kyc(userId, 'passport_verify', 'completed', {
        success: result.success
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Passport verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify passport'
      });
    }
  }

  /**
   * Validate passport format
   */
  async validatePassportFormat(req, res) {
    try {
      const { passportNumber, dateOfBirth } = req.body;
      
      const isValidFormat = Utils.validatePassportFormat(passportNumber);
      const isValidDate = Utils.validateDateFormat(dateOfBirth);
      
      res.json({
        success: true,
        data: {
          passportNumber: Utils.maskSensitiveData(passportNumber),
          isValidFormat,
          isValidDate,
          message: isValidFormat && isValidDate ? 'Valid passport format' : 'Invalid passport format'
        }
      });
      
    } catch (error) {
      logger.error('Passport validation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate passport'
      });
    }
  }

  /**
   * Get passport verification status
   */
  async getPassportStatus(req, res) {
    try {
      const { userId } = req.params;
      
      // For now, return sample status
      res.json({
        success: true,
        data: {
          userId,
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          passportHash: 'sample_hash'
        }
      });
      
    } catch (error) {
      logger.error('Error getting passport status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get passport status'
      });
    }
  }

  /**
   * Retry passport verification
   */
  async retryPassportVerification(req, res) {
    try {
      const { passportNumber, dateOfBirth, userId } = req.body;
      
      logger.kyc(userId, 'passport_retry', 'started');
      
      const result = await kycService.verifyPassport(passportNumber, dateOfBirth, userId);
      
      logger.kyc(userId, 'passport_retry', 'completed', {
        success: result.success
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Passport retry failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry passport verification'
      });
    }
  }

  /**
   * Get passport verification history
   */
  async getPassportHistory(req, res) {
    try {
      const { userId } = req.params;
      
      // For now, return sample history
      res.json({
        success: true,
        data: {
          userId,
          history: [
            {
              id: Utils.generateReferenceId('PASSPORT_HIST'),
              timestamp: new Date().toISOString(),
              status: 'verified',
              passportHash: 'sample_hash'
            }
          ]
        }
      });
      
    } catch (error) {
      logger.error('Error getting passport history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get passport history'
      });
    }
  }
}

module.exports = new PassportController();
