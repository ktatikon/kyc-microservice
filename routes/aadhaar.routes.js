const express = require('express');
const router = express.Router();
const aadhaarController = require('../controllers/aadhaar.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { aadhaarSchemas } = require('../schemas/kyc.schemas');

/**
 * @route POST /api/kyc/aadhaar/otp/initiate
 * @desc Initiate Aadhaar OTP verification
 * @access Private
 */
router.post('/otp/initiate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.initiateOTP),
  aadhaarController.initiateOTP
);

/**
 * @route POST /api/kyc/aadhaar/otp/verify
 * @desc Verify Aadhaar OTP and get KYC data
 * @access Private
 */
router.post('/otp/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.verifyOTP),
  aadhaarController.verifyOTP
);

/**
 * @route POST /api/kyc/aadhaar/otp/resend
 * @desc Resend Aadhaar OTP
 * @access Private
 */
router.post('/otp/resend',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.resendOTP),
  aadhaarController.resendOTP
);

/**
 * @route POST /api/kyc/aadhaar/biometric/initiate
 * @desc Initiate Aadhaar biometric verification
 * @access Private
 */
router.post('/biometric/initiate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.initiateBiometric),
  aadhaarController.initiateBiometric
);

/**
 * @route POST /api/kyc/aadhaar/biometric/verify
 * @desc Verify Aadhaar biometric data
 * @access Private
 */
router.post('/biometric/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.verifyBiometric),
  aadhaarController.verifyBiometric
);

/**
 * @route POST /api/kyc/aadhaar/qr/scan
 * @desc Process Aadhaar QR code
 * @access Private
 */
router.post('/qr/scan',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.scanQR),
  aadhaarController.scanQR
);

/**
 * @route POST /api/kyc/aadhaar/offline/upload
 * @desc Upload offline Aadhaar XML file
 * @access Private
 */
router.post('/offline/upload',
  authMiddleware.authenticate,
  aadhaarController.uploadOfflineXML
);

/**
 * @route POST /api/kyc/aadhaar/offline/verify
 * @desc Verify offline Aadhaar XML data
 * @access Private
 */
router.post('/offline/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.verifyOffline),
  aadhaarController.verifyOfflineXML
);

/**
 * @route GET /api/kyc/aadhaar/status/:referenceId
 * @desc Get Aadhaar verification status
 * @access Private
 */
router.get('/status/:referenceId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(aadhaarSchemas.referenceIdParam),
  aadhaarController.getVerificationStatus
);

/**
 * @route POST /api/kyc/aadhaar/validate
 * @desc Validate Aadhaar number format
 * @access Private
 */
router.post('/validate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.validateNumber),
  aadhaarController.validateAadhaarNumber
);

/**
 * @route GET /api/kyc/aadhaar/consent/:userId
 * @desc Get Aadhaar consent status
 * @access Private
 */
router.get('/consent/:userId',
  authMiddleware.authenticate,
  validationMiddleware.validateParams(aadhaarSchemas.userIdParam),
  aadhaarController.getConsentStatus
);

/**
 * @route POST /api/kyc/aadhaar/consent/grant
 * @desc Grant Aadhaar usage consent
 * @access Private
 */
router.post('/consent/grant',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.grantConsent),
  aadhaarController.grantConsent
);

/**
 * @route POST /api/kyc/aadhaar/consent/revoke
 * @desc Revoke Aadhaar usage consent
 * @access Private
 */
router.post('/consent/revoke',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(aadhaarSchemas.revokeConsent),
  aadhaarController.revokeConsent
);

module.exports = router;
