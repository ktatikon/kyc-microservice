const express = require('express');
const router = express.Router();
const panController = require('../controllers/pan.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { panSchemas } = require('../schemas/kyc.schemas');

/**
 * @route POST /api/kyc/pan/verify
 * @desc Verify PAN number against NSDL database
 * @access Private
 */
router.post('/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(panSchemas.verify),
  validationMiddleware.validateKYCFields,
  panController.verifyPAN
);

/**
 * @route POST /api/kyc/pan/validate
 * @desc Validate PAN number format
 * @access Private
 */
router.post('/validate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(panSchemas.validate),
  panController.validatePANFormat
);

/**
 * @route GET /api/kyc/pan/status/:userId
 * @desc Get PAN verification status for a user
 * @access Private
 */
router.get('/status/:userId',
  authMiddleware.authenticate,
  authMiddleware.validateUserContext,
  panController.getPANStatus
);

/**
 * @route POST /api/kyc/pan/retry
 * @desc Retry PAN verification
 * @access Private
 */
router.post('/retry',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(panSchemas.verify),
  panController.retryPANVerification
);

/**
 * @route GET /api/kyc/pan/history/:userId
 * @desc Get PAN verification history
 * @access Private
 */
router.get('/history/:userId',
  authMiddleware.authenticate,
  authMiddleware.validateUserContext,
  panController.getPANHistory
);

module.exports = router;
