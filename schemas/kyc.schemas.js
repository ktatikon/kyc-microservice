const Joi = require('joi');

/**
 * Joi validation schemas for KYC service
 */

// Common patterns
const aadhaarPattern = /^\d{12}$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const passportPattern = /^[A-Z]{1,2}[0-9]{7}$/;
const mobilePattern = /^[6-9]\d{9}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Base schemas
const userIdSchema = Joi.string().uuid().required();
const referenceIdSchema = Joi.string().min(10).max(50).required();

// Aadhaar schemas
const aadhaarSchemas = {
  initiateOTP: Joi.object({
    aadhaarNumber: Joi.string().pattern(aadhaarPattern).required()
      .messages({
        'string.pattern.base': 'Aadhaar number must be 12 digits',
        'any.required': 'Aadhaar number is required'
      }),
    userId: userIdSchema,
    consent: Joi.boolean().valid(true).required()
      .messages({
        'any.only': 'User consent is required for Aadhaar verification'
      })
  }),

  verifyOTP: Joi.object({
    referenceId: referenceIdSchema.optional(), // For backward compatibility
    taskId: referenceIdSchema.optional(), // IDfy standard
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
      .messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers'
      }),
    userId: userIdSchema
  }).or('referenceId', 'taskId') // At least one must be present
    .messages({
      'object.missing': 'Either referenceId or taskId must be provided'
    }),

  resendOTP: Joi.object({
    referenceId: referenceIdSchema.optional(), // For backward compatibility
    taskId: referenceIdSchema.optional(), // IDfy standard
    userId: userIdSchema
  }).or('referenceId', 'taskId') // At least one must be present
    .messages({
      'object.missing': 'Either referenceId or taskId must be provided'
    }),

  initiateBiometric: Joi.object({
    aadhaarNumber: Joi.string().pattern(aadhaarPattern).required(),
    userId: userIdSchema,
    biometricType: Joi.string().valid('fingerprint', 'iris').required(),
    consent: Joi.boolean().valid(true).required()
  }),

  verifyBiometric: Joi.object({
    referenceId: referenceIdSchema,
    biometricData: Joi.string().base64().required(),
    userId: userIdSchema
  }),

  scanQR: Joi.object({
    qrData: Joi.string().required(),
    userId: userIdSchema
  }),

  verifyOffline: Joi.object({
    xmlData: Joi.string().required(),
    shareCode: Joi.string().length(4).required(),
    userId: userIdSchema
  }),

  validateNumber: Joi.object({
    aadhaarNumber: Joi.string().pattern(aadhaarPattern).required()
  }),

  grantConsent: Joi.object({
    userId: userIdSchema,
    consentType: Joi.string().valid('otp', 'biometric', 'offline').required(),
    purpose: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  }),

  revokeConsent: Joi.object({
    userId: userIdSchema,
    consentId: Joi.string().required(),
    reason: Joi.string().optional()
  }),

  userIdParam: Joi.object({
    userId: userIdSchema
  }),

  referenceIdParam: Joi.object({
    referenceId: referenceIdSchema
  })
};

// PAN schemas
const panSchemas = {
  verify: Joi.object({
    panNumber: Joi.string().pattern(panPattern).required()
      .messages({
        'string.pattern.base': 'PAN number must be in format ABCDE1234F',
        'any.required': 'PAN number is required'
      }),
    userId: userIdSchema,
    name: Joi.string().min(2).max(100).optional(),
    dateOfBirth: Joi.date().iso().max('now').optional()
  }),

  validate: Joi.object({
    panNumber: Joi.string().pattern(panPattern).required()
  })
};

// Passport schemas
const passportSchemas = {
  verify: Joi.object({
    passportNumber: Joi.string().pattern(passportPattern).required()
      .messages({
        'string.pattern.base': 'Invalid passport number format',
        'any.required': 'Passport number is required'
      }),
    dateOfBirth: Joi.date().iso().max('now').required(),
    userId: userIdSchema,
    name: Joi.string().min(2).max(100).optional(),
    nationality: Joi.string().length(2).default('IN').optional()
  }),

  validate: Joi.object({
    passportNumber: Joi.string().pattern(passportPattern).required(),
    dateOfBirth: Joi.date().iso().required()
  })
};

// Main KYC schemas
const kycSchemas = {
  initiateKYC: Joi.object({
    userId: userIdSchema,
    personalInfo: Joi.object({
      firstName: Joi.string().min(2).max(50).required(),
      middleName: Joi.string().min(2).max(50).optional(),
      lastName: Joi.string().min(2).max(50).required(),
      dateOfBirth: Joi.date().iso().max('now').required(),
      gender: Joi.string().valid('male', 'female', 'other').required(),
      email: Joi.string().email().required(),
      mobile: Joi.string().pattern(mobilePattern).required()
        .messages({
          'string.pattern.base': 'Mobile number must be 10 digits starting with 6-9'
        }),
      address: Joi.object({
        line1: Joi.string().min(5).max(100).required(),
        line2: Joi.string().max(100).optional(),
        city: Joi.string().min(2).max(50).required(),
        state: Joi.string().min(2).max(50).required(),
        pincode: Joi.string().pattern(/^\d{6}$/).required(),
        country: Joi.string().length(2).default('IN')
      }).required()
    }).required()
  }),

  completeKYC: Joi.object({
    userId: userIdSchema,
    verificationData: Joi.object({
      aadhaarVerified: Joi.boolean().required(),
      panVerified: Joi.boolean().required(),
      passportVerified: Joi.boolean().optional(),
      documentsUploaded: Joi.boolean().required(),
      selfieVerified: Joi.boolean().optional()
    }).required()
  }),

  retryKYC: Joi.object({
    userId: userIdSchema,
    step: Joi.string().valid('aadhaar', 'pan', 'passport', 'documents', 'selfie').required(),
    referenceId: Joi.string().optional()
  }),

  validateKYC: Joi.object({
    userId: userIdSchema,
    kycData: Joi.object({
      aadhaarNumber: Joi.string().pattern(aadhaarPattern).optional(),
      panNumber: Joi.string().pattern(panPattern).optional(),
      passportNumber: Joi.string().pattern(passportPattern).optional(),
      personalInfo: Joi.object().optional()
    }).required()
  }),

  userIdParam: Joi.object({
    userId: userIdSchema
  }),

  historyQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })
};

// Document upload schemas
const documentSchemas = {
  upload: Joi.object({
    userId: userIdSchema,
    documentType: Joi.string().valid('aadhaar_front', 'aadhaar_back', 'pan', 'passport', 'selfie').required(),
    description: Joi.string().max(200).optional()
  }),

  validate: Joi.object({
    documentId: Joi.string().uuid().required(),
    userId: userIdSchema
  })
};

// Error response schema (for documentation)
const errorResponseSchema = Joi.object({
  success: Joi.boolean().valid(false).required(),
  error: Joi.string().required(),
  details: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      message: Joi.string().required(),
      value: Joi.any().optional()
    })
  ).optional(),
  timestamp: Joi.date().iso().default(() => new Date()),
  requestId: Joi.string().uuid().optional()
});

// Success response schema (for documentation)
const successResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.any().required(),
  message: Joi.string().optional(),
  timestamp: Joi.date().iso().default(() => new Date()),
  requestId: Joi.string().uuid().optional()
});

// Biometric verification schemas
const biometricSchemas = {
  initiate: Joi.object({
    aadhaarNumber: Joi.string().length(12).pattern(/^\d{12}$/).required()
      .messages({
        'string.length': 'Aadhaar number must be exactly 12 digits',
        'string.pattern.base': 'Aadhaar number must contain only digits'
      }),
    biometricType: Joi.string().valid('fingerprint', 'iris', 'face').required()
      .messages({
        'any.only': 'Biometric type must be one of: fingerprint, iris, face'
      }),
    userId: userIdSchema,
    deviceId: Joi.string().optional(),
    consent: Joi.boolean().valid(true).required()
      .messages({
        'any.only': 'Consent must be explicitly given (true)'
      })
  }),

  capture: Joi.object({
    sessionId: Joi.string().required(),
    userId: userIdSchema,
    biometricData: Joi.object({
      type: Joi.string().valid('fingerprint', 'iris', 'face').required(),
      format: Joi.string().required(),
      template: Joi.string().required(),
      quality: Joi.number().min(0).max(100).optional(),
      deviceId: Joi.string().optional()
    }).required()
  }),

  verify: Joi.object({
    sessionId: Joi.string().required(),
    captureId: Joi.string().required(),
    aadhaarNumber: Joi.string().length(12).pattern(/^\d{12}$/).required(),
    userId: userIdSchema
  }),

  retry: Joi.object({
    sessionId: Joi.string().required(),
    userId: userIdSchema,
    reason: Joi.string().optional()
  }),

  cancel: Joi.object({
    sessionId: Joi.string().required(),
    userId: userIdSchema,
    reason: Joi.string().optional()
  })
};

// Export all schemas
module.exports = {
  aadhaarSchemas,
  panSchemas,
  passportSchemas,
  kycSchemas,
  documentSchemas,
  biometricSchemas,
  errorResponseSchema,
  successResponseSchema,
  
  // Common validation patterns
  patterns: {
    aadhaar: aadhaarPattern,
    pan: panPattern,
    passport: passportPattern,
    mobile: mobilePattern,
    uuid: uuidPattern
  },
  
  // Utility functions for custom validation
  validators: {
    isValidAadhaar: (value) => aadhaarPattern.test(value),
    isValidPAN: (value) => panPattern.test(value),
    isValidPassport: (value) => passportPattern.test(value),
    isValidMobile: (value) => mobilePattern.test(value),
    isValidUUID: (value) => uuidPattern.test(value)
  }
};
