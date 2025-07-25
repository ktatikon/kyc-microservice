const aadhaarBiometricService = require('../services/aadhaarBiometricService');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class BiometricController {
  /**
   * Initiate biometric verification session
   */
  async initiateBiometricVerification(req, res) {
    try {
      const { aadhaarNumber, biometricType, userId } = req.body;
      
      logger.kyc(userId, 'biometric_initiate', 'started', {
        biometricType,
        aadhaar: Utils.maskAadhaar(aadhaarNumber)
      });
      
      const result = await aadhaarBiometricService.initiateBiometricVerification(
        aadhaarNumber,
        biometricType,
        userId
      );
      
      logger.kyc(userId, 'biometric_initiate', 'completed', {
        sessionId: result.sessionId
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Biometric initiation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate biometric verification'
      });
    }
  }

  /**
   * Capture biometric data
   */
  async captureBiometric(req, res) {
    try {
      const { sessionId, biometricData, userId } = req.body;
      
      logger.kyc(userId, 'biometric_capture', 'started', { sessionId });
      
      const result = await aadhaarBiometricService.captureBiometricData(
        sessionId,
        biometricData,
        userId
      );
      
      logger.kyc(userId, 'biometric_capture', 'completed', {
        captureId: result.captureId,
        quality: result.quality.score
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Biometric capture failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to capture biometric data'
      });
    }
  }

  /**
   * Verify biometric against Aadhaar
   */
  async verifyBiometric(req, res) {
    try {
      const { sessionId, captureId, aadhaarNumber, userId } = req.body;
      
      logger.kyc(userId, 'biometric_verify', 'started', {
        sessionId,
        captureId,
        aadhaar: Utils.maskAadhaar(aadhaarNumber)
      });
      
      const result = await aadhaarBiometricService.verifyBiometric(
        sessionId,
        captureId,
        aadhaarNumber,
        userId
      );
      
      logger.kyc(userId, 'biometric_verify', 'completed', {
        verified: result.verified,
        matchScore: result.matchScore
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Biometric verification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify biometric data'
      });
    }
  }

  /**
   * Get biometric device information
   */
  async getDeviceInfo(req, res) {
    try {
      const { deviceId } = req.params;
      
      const deviceInfo = await aadhaarBiometricService.getBiometricDeviceInfo(deviceId);
      
      res.json({
        success: true,
        data: deviceInfo
      });
      
    } catch (error) {
      logger.error('Error getting device info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device information'
      });
    }
  }

  /**
   * Get biometric verification history
   */
  async getBiometricHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit } = req.query;
      
      const history = await aadhaarBiometricService.getBiometricHistory(
        userId,
        parseInt(limit) || 10
      );
      
      res.json({
        success: true,
        data: history
      });
      
    } catch (error) {
      logger.error('Error getting biometric history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get biometric history'
      });
    }
  }

  /**
   * Get supported biometric types and configurations
   */
  async getBiometricConfig(req, res) {
    try {
      const config = {
        supportedTypes: ['fingerprint', 'iris', 'face'],
        configurations: {
          fingerprint: {
            minQuality: 60,
            timeout: 10000,
            maxAttempts: 3,
            supportedFormats: ['ISO_19794_2', 'ANSI_378'],
            instructions: [
              'Place your finger firmly on the scanner',
              'Keep finger steady until capture is complete',
              'Ensure finger is clean and dry',
              'Use the same finger for all attempts'
            ]
          },
          iris: {
            minQuality: 70,
            timeout: 15000,
            maxAttempts: 2,
            supportedFormats: ['ISO_19794_6'],
            instructions: [
              'Look directly into the iris scanner',
              'Keep eyes open and steady',
              'Remove glasses if wearing any',
              'Maintain distance of 6-8 inches from scanner'
            ]
          },
          face: {
            minQuality: 65,
            timeout: 8000,
            maxAttempts: 3,
            supportedFormats: ['ISO_19794_5'],
            instructions: [
              'Look directly at the camera',
              'Keep face within the frame',
              'Ensure good lighting',
              'Remove any face coverings'
            ]
          }
        }
      };
      
      res.json({
        success: true,
        data: config
      });
      
    } catch (error) {
      logger.error('Error getting biometric config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get biometric configuration'
      });
    }
  }

  /**
   * Health check for biometric service
   */
  async healthCheck(req, res) {
    try {
      const health = await aadhaarBiometricService.healthCheck();
      
      res.json({
        success: true,
        data: health
      });
      
    } catch (error) {
      logger.error('Biometric health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Biometric service health check failed'
      });
    }
  }

  /**
   * Cancel biometric session
   */
  async cancelBiometricSession(req, res) {
    try {
      const { sessionId, userId } = req.body;
      
      logger.kyc(userId, 'biometric_cancel', 'completed', { sessionId });
      
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'cancelled',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Error cancelling biometric session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel biometric session'
      });
    }
  }

  /**
   * Retry biometric capture
   */
  async retryBiometricCapture(req, res) {
    try {
      const { sessionId, userId, reason } = req.body;
      
      logger.kyc(userId, 'biometric_retry', 'started', { 
        sessionId,
        reason 
      });
      
      // Reset session for retry
      const result = {
        sessionId,
        status: 'ready_for_retry',
        attemptsRemaining: 2, // Mock remaining attempts
        reason,
        timestamp: new Date().toISOString()
      };
      
      logger.kyc(userId, 'biometric_retry', 'completed', { sessionId });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error retrying biometric capture:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry biometric capture'
      });
    }
  }
}

module.exports = new BiometricController();
