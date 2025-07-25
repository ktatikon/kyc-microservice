const express = require('express');
const router = express.Router();

// Middleware
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { biometricSchemas } = require('../schemas/kyc.schemas');

// Controller
const biometricController = require('../controllers/biometric.controller');

/**
 * @route POST /api/kyc/biometric/initiate
 * @desc Initiate biometric verification session
 * @access Private
 */
router.post('/initiate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(biometricSchemas.initiate),
  biometricController.initiateBiometricVerification
);

/**
 * @route POST /api/kyc/biometric/capture
 * @desc Capture biometric data
 * @access Private
 */
router.post('/capture',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(biometricSchemas.capture),
  biometricController.captureBiometric
);

/**
 * @route POST /api/kyc/biometric/verify
 * @desc Verify biometric data against Aadhaar
 * @access Private
 */
router.post('/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(biometricSchemas.verify),
  biometricController.verifyBiometric
);

/**
 * @route POST /api/kyc/biometric/retry
 * @desc Retry biometric capture
 * @access Private
 */
router.post('/retry',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(biometricSchemas.retry),
  biometricController.retryBiometricCapture
);

/**
 * @route POST /api/kyc/biometric/cancel
 * @desc Cancel biometric session
 * @access Private
 */
router.post('/cancel',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(biometricSchemas.cancel),
  biometricController.cancelBiometricSession
);

/**
 * @route GET /api/kyc/biometric/config
 * @desc Get biometric configuration
 * @access Private
 */
router.get('/config',
  authMiddleware.authenticate,
  biometricController.getBiometricConfig
);

/**
 * @route GET /api/kyc/biometric/device/:deviceId
 * @desc Get biometric device information
 * @access Private
 */
router.get('/device/:deviceId',
  authMiddleware.authenticate,
  biometricController.getDeviceInfo
);

/**
 * @route GET /api/kyc/biometric/history/:userId
 * @desc Get biometric verification history
 * @access Private
 */
router.get('/history/:userId',
  authMiddleware.authenticate,
  biometricController.getBiometricHistory
);

/**
 * @route GET /api/kyc/biometric/health
 * @desc Biometric service health check
 * @access Private
 */
router.get('/health',
  authMiddleware.authenticate,
  biometricController.healthCheck
);

module.exports = router;
