const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kyc.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { kycSchemas } = require('../schemas/kyc.schemas');

/**
 * @route GET /api/kyc/status/:userId
 * @desc Get KYC status for a user
 * @access Private
 */
router.get('/status/:userId', 
  authMiddleware.authenticate,
  validationMiddleware.validateParams(kycSchemas.userIdParam),
  kycController.getKYCStatus
);

/**
 * @route POST /api/kyc/initiate
 * @desc Initiate KYC process for a user
 * @access Private
 */
router.post('/initiate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(kycSchemas.initiateKYC),
  kycController.initiateKYC
);

/**
 * @route GET /api/kyc/progress/:userId
 * @desc Get KYC progress for a user
 * @access Private
 */
router.get('/progress/:userId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(kycSchemas.userIdParam),
  kycController.getKYCProgress
);

/**
 * @route POST /api/kyc/complete
 * @desc Complete KYC process
 * @access Private
 */
router.post('/complete',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(kycSchemas.completeKYC),
  kycController.completeKYC
);

/**
 * @route GET /api/kyc/history/:userId
 * @desc Get KYC history for a user
 * @access Private
 */
router.get('/history/:userId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(kycSchemas.userIdParam),
  validationMiddleware.validateQuery(kycSchemas.historyQuery),
  kycController.getKYCHistory
);

/**
 * @route POST /api/kyc/retry
 * @desc Retry failed KYC step
 * @access Private
 */
router.post('/retry',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(kycSchemas.retryKYC),
  kycController.retryKYC
);

/**
 * @route DELETE /api/kyc/cancel/:userId
 * @desc Cancel ongoing KYC process
 * @access Private
 */
router.delete('/cancel/:userId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(kycSchemas.userIdParam),
  kycController.cancelKYC
);

/**
 * @route GET /api/kyc/documents/:userId
 * @desc Get uploaded documents for a user
 * @access Private
 */
router.get('/documents/:userId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(kycSchemas.userIdParam),
  kycController.getDocuments
);

/**
 * @route POST /api/kyc/documents/upload
 * @desc Upload KYC documents
 * @access Private
 */
router.post('/documents/upload',
  authMiddleware.authenticate,
  kycController.uploadDocuments
);

/**
 * @route GET /api/kyc/providers
 * @desc Get available KYC providers and their status
 * @access Private
 */
router.get('/providers',
  authMiddleware.authenticate,
  kycController.getProviders
);

/**
 * @route POST /api/kyc/validate
 * @desc Validate KYC data before submission
 * @access Private
 */
router.post('/validate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(kycSchemas.validateKYC),
  kycController.validateKYCData
);

/**
 * @route GET /api/kyc/requirements
 * @desc Get KYC requirements and guidelines
 * @access Public
 */
router.get('/requirements',
  kycController.getKYCRequirements
);

module.exports = router;
