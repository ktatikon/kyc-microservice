const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passport.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');
const { passportSchemas } = require('../schemas/kyc.schemas');

/**
 * @route POST /api/kyc/passport/verify
 * @desc Verify passport against government database
 * @access Private
 */
router.post('/verify',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(passportSchemas.verify),
  validationMiddleware.validateKYCFields,
  passportController.verifyPassport
);

/**
 * @route POST /api/kyc/passport/validate
 * @desc Validate passport number format
 * @access Private
 */
router.post('/validate',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(passportSchemas.validate),
  passportController.validatePassportFormat
);

/**
 * @route GET /api/kyc/passport/status/:userId
 * @desc Get passport verification status for a user
 * @access Private
 */
router.get('/status/:userId',
  authMiddleware.authenticate,
  authMiddleware.validateUserContext,
  passportController.getPassportStatus
);

/**
 * @route POST /api/kyc/passport/retry
 * @desc Retry passport verification
 * @access Private
 */
router.post('/retry',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(passportSchemas.verify),
  passportController.retryPassportVerification
);

/**
 * @route GET /api/kyc/passport/history/:userId
 * @desc Get passport verification history
 * @access Private
 */
router.get('/history/:userId',
  authMiddleware.authenticate,
  authMiddleware.validateUserContext,
  passportController.getPassportHistory
);

module.exports = router;
