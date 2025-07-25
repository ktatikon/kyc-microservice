const kycService = require('../services/kyc.service');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class KYCController {
  /**
   * Get KYC status for a user
   */
  async getKYCStatus(req, res) {
    try {
      const { userId } = req.params;
      
      logger.kyc(userId, 'status_check', 'initiated');
      
      const status = await kycService.getKYCStatus(userId);
      
      logger.kyc(userId, 'status_check', 'completed', { status: status.status });
      
      res.json({
        success: true,
        data: status
      });
      
    } catch (error) {
      logger.error('Error getting KYC status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KYC status'
      });
    }
  }

  /**
   * Initiate KYC process
   */
  async initiateKYC(req, res) {
    try {
      const { userId, personalInfo } = req.body;
      
      logger.kyc(userId, 'initiate', 'started');
      
      // Sanitize input data
      const sanitizedInfo = Utils.sanitizeInput(personalInfo);
      
      const result = await kycService.initiateKYC(userId, sanitizedInfo);
      
      logger.kyc(userId, 'initiate', 'completed', { 
        referenceId: result.referenceId 
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error initiating KYC:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate KYC process'
      });
    }
  }

  /**
   * Get KYC progress
   */
  async getKYCProgress(req, res) {
    try {
      const { userId } = req.params;
      
      const progress = await kycService.getKYCProgress(userId);
      
      res.json({
        success: true,
        data: progress
      });
      
    } catch (error) {
      logger.error('Error getting KYC progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KYC progress'
      });
    }
  }

  /**
   * Complete KYC process
   */
  async completeKYC(req, res) {
    try {
      const { userId, verificationData } = req.body;
      
      logger.kyc(userId, 'complete', 'started');
      
      const result = await kycService.completeKYC(userId, verificationData);
      
      logger.kyc(userId, 'complete', result.success ? 'completed' : 'failed', {
        status: result.status
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error completing KYC:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete KYC process'
      });
    }
  }

  /**
   * Get KYC history
   */
  async getKYCHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, status } = req.query;
      
      const history = await kycService.getKYCHistory(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      
      res.json({
        success: true,
        data: history
      });
      
    } catch (error) {
      logger.error('Error getting KYC history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KYC history'
      });
    }
  }

  /**
   * Retry failed KYC step
   */
  async retryKYC(req, res) {
    try {
      const { userId, step, referenceId } = req.body;
      
      logger.kyc(userId, 'retry', 'started', { step, referenceId });
      
      const result = await kycService.retryKYCStep(userId, step, referenceId);
      
      logger.kyc(userId, 'retry', result.success ? 'completed' : 'failed', {
        step,
        referenceId
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error retrying KYC step:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry KYC step'
      });
    }
  }

  /**
   * Cancel KYC process
   */
  async cancelKYC(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      logger.kyc(userId, 'cancel', 'started', { reason });
      
      const result = await kycService.cancelKYC(userId, reason);
      
      logger.kyc(userId, 'cancel', 'completed');
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error canceling KYC:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel KYC process'
      });
    }
  }

  /**
   * Get uploaded documents
   */
  async getDocuments(req, res) {
    try {
      const { userId } = req.params;
      
      const documents = await kycService.getDocuments(userId);
      
      res.json({
        success: true,
        data: documents
      });
      
    } catch (error) {
      logger.error('Error getting documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get documents'
      });
    }
  }

  /**
   * Upload KYC documents
   */
  async uploadDocuments(req, res) {
    try {
      const { userId, documentType } = req.body;
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }
      
      logger.kyc(userId, 'document_upload', 'started', { 
        documentType,
        fileCount: files.length 
      });
      
      const result = await kycService.uploadDocuments(userId, documentType, files);
      
      logger.kyc(userId, 'document_upload', 'completed', {
        documentType,
        uploadedFiles: result.uploadedFiles
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error uploading documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload documents'
      });
    }
  }

  /**
   * Get available KYC providers
   */
  async getProviders(req, res) {
    try {
      const providers = await kycService.getProviders();
      
      res.json({
        success: true,
        data: providers
      });
      
    } catch (error) {
      logger.error('Error getting providers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get providers'
      });
    }
  }

  /**
   * Validate KYC data
   */
  async validateKYCData(req, res) {
    try {
      const { userId, kycData } = req.body;
      
      const validation = await kycService.validateKYCData(userId, kycData);
      
      res.json({
        success: true,
        data: validation
      });
      
    } catch (error) {
      logger.error('Error validating KYC data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate KYC data'
      });
    }
  }

  /**
   * Get KYC requirements
   */
  async getKYCRequirements(req, res) {
    try {
      const requirements = await kycService.getKYCRequirements();
      
      res.json({
        success: true,
        data: requirements
      });
      
    } catch (error) {
      logger.error('Error getting KYC requirements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KYC requirements'
      });
    }
  }
}

module.exports = new KYCController();
