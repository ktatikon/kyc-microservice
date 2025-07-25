const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      // Mask sensitive data in logs
      const maskedMeta = maskSensitiveData(meta);
      const logEntry = {
        timestamp,
        level,
        message,
        ...maskedMeta
      };
      
      if (stack) {
        logEntry.stack = stack;
      }
      
      return JSON.stringify(logEntry);
    })
  ),
  transports: [
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ],
});

/**
 * Mask sensitive data in log entries
 * @param {Object} data - Data object to mask
 * @returns {Object} - Masked data object
 */
function maskSensitiveData(data) {
  const sensitiveFields = [
    'aadhaar', 'aadhaarNumber', 'aadhar',
    'pan', 'panNumber', 'panCard',
    'passport', 'passportNumber',
    'otp', 'otpCode',
    'password', 'token', 'apiKey',
    'privateKey', 'seedPhrase',
    'phone', 'mobile', 'phoneNumber'
  ];
  
  const masked = { ...data };
  
  function maskValue(value) {
    if (typeof value === 'string' && value.length > 4) {
      return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
    }
    return '***';
  }
  
  function maskObject(obj, visited = new WeakSet()) {
    if (!obj || typeof obj !== 'object') return obj;

    // Handle circular references
    if (visited.has(obj)) return '[Circular Reference]';
    visited.add(obj);

    const result = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = maskObject(value, visited);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
  
  return maskObject(masked);
}

/**
 * Create audit log entry for KYC/AML operations
 * @param {string} userId - User ID
 * @param {string} operation - Operation type
 * @param {string} status - Operation status
 * @param {Object} metadata - Additional metadata
 */
logger.audit = function(userId, operation, status, metadata = {}) {
  logger.info('AUDIT_LOG', {
    userId,
    operation,
    status,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

/**
 * Log KYC operation
 * @param {string} userId - User ID
 * @param {string} step - KYC step
 * @param {string} status - Status
 * @param {Object} details - Additional details
 */
logger.kyc = function(userId, step, status, details = {}) {
  logger.audit(userId, `KYC_${step.toUpperCase()}`, status, {
    kycStep: step,
    ...details
  });
};

/**
 * Log AML operation
 * @param {string} userId - User ID
 * @param {string} checkType - AML check type
 * @param {string} status - Status
 * @param {Object} details - Additional details
 */
logger.aml = function(userId, checkType, status, details = {}) {
  logger.audit(userId, `AML_${checkType.toUpperCase()}`, status, {
    amlCheckType: checkType,
    ...details
  });
};

module.exports = logger;
