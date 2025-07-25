const Joi = require('joi');
const logger = require('../../shared/logger');
const Utils = require('../../shared/utils');

class ValidationMiddleware {
  /**
   * Validate request body against Joi schema
   * @param {Object} schema - Joi validation schema
   */
  validateBody(schema) {
    return (req, res, next) => {
      try {
        // Sanitize input data
        req.body = Utils.sanitizeInput(req.body);
        
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          logger.warn('Request body validation failed', {
            endpoint: req.path,
            errors: errorDetails,
            userId: req.user?.sub || req.user?.userId
          });
          
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errorDetails
          });
        }
        
        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
        
      } catch (validationError) {
        logger.error('Body validation middleware error:', validationError);
        return res.status(500).json({
          success: false,
          error: 'Validation service error'
        });
      }
    };
  }

  /**
   * Validate request parameters against Joi schema
   * @param {Object} schema - Joi validation schema
   */
  validateParams(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          logger.warn('Request params validation failed', {
            endpoint: req.path,
            errors: errorDetails,
            userId: req.user?.sub || req.user?.userId
          });
          
          return res.status(400).json({
            success: false,
            error: 'Parameter validation failed',
            details: errorDetails
          });
        }
        
        req.params = value;
        next();
        
      } catch (validationError) {
        logger.error('Params validation middleware error:', validationError);
        return res.status(500).json({
          success: false,
          error: 'Validation service error'
        });
      }
    };
  }

  /**
   * Validate query parameters against Joi schema
   * @param {Object} schema - Joi validation schema
   */
  validateQuery(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          logger.warn('Request query validation failed', {
            endpoint: req.path,
            errors: errorDetails,
            userId: req.user?.sub || req.user?.userId
          });
          
          return res.status(400).json({
            success: false,
            error: 'Query validation failed',
            details: errorDetails
          });
        }
        
        req.query = value;
        next();
        
      } catch (validationError) {
        logger.error('Query validation middleware error:', validationError);
        return res.status(500).json({
          success: false,
          error: 'Validation service error'
        });
      }
    };
  }

  /**
   * Validate file uploads
   * @param {Object} options - File validation options
   */
  validateFiles(options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      maxFiles = 5,
      required = false
    } = options;
    
    return (req, res, next) => {
      try {
        const files = req.files || [];
        
        // Check if files are required
        if (required && files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'File upload is required'
          });
        }
        
        // Check number of files
        if (files.length > maxFiles) {
          return res.status(400).json({
            success: false,
            error: `Maximum ${maxFiles} files allowed`
          });
        }
        
        // Validate each file
        for (const file of files) {
          // Check file size
          if (file.size > maxSize) {
            return res.status(400).json({
              success: false,
              error: `File ${file.originalname} exceeds maximum size of ${maxSize / (1024 * 1024)}MB`
            });
          }
          
          // Check file type
          if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
              success: false,
              error: `File ${file.originalname} has unsupported type. Allowed types: ${allowedTypes.join(', ')}`
            });
          }
          
          // Basic security check - scan for malicious content
          if (this.containsMaliciousContent(file)) {
            logger.warn('Malicious file upload attempt', {
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              userId: req.user?.sub || req.user?.userId,
              ip: req.ip
            });
            
            return res.status(400).json({
              success: false,
              error: 'File contains potentially malicious content'
            });
          }
        }
        
        logger.info('File validation successful', {
          fileCount: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          userId: req.user?.sub || req.user?.userId
        });
        
        next();
        
      } catch (validationError) {
        logger.error('File validation middleware error:', validationError);
        return res.status(500).json({
          success: false,
          error: 'File validation service error'
        });
      }
    };
  }

  /**
   * Basic malicious content detection
   * @param {Object} file - Uploaded file
   * @returns {boolean} True if potentially malicious
   */
  containsMaliciousContent(file) {
    // Check for suspicious file extensions in filename
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs'];
    const filename = file.originalname.toLowerCase();
    
    for (const ext of suspiciousExtensions) {
      if (filename.includes(ext)) {
        return true;
      }
    }
    
    // Check for suspicious MIME types
    const suspiciousMimeTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program'
    ];
    
    if (suspiciousMimeTypes.includes(file.mimetype)) {
      return true;
    }
    
    // Check file buffer for suspicious patterns (basic check)
    if (file.buffer) {
      const bufferString = file.buffer.toString('hex');
      
      // Check for executable signatures
      const executableSignatures = ['4d5a', '504b0304']; // MZ (exe), PK (zip)
      
      for (const signature of executableSignatures) {
        if (bufferString.startsWith(signature) && !file.mimetype.includes('zip')) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Custom validation for specific KYC fields
   */
  validateKYCFields(req, res, next) {
    try {
      const { body } = req;
      const errors = [];
      
      // Validate Aadhaar number if present
      if (body.aadhaarNumber && !Utils.validateAadhaarFormat(body.aadhaarNumber)) {
        errors.push({
          field: 'aadhaarNumber',
          message: 'Invalid Aadhaar number format'
        });
      }
      
      // Validate PAN number if present
      if (body.panNumber && !Utils.validatePANFormat(body.panNumber)) {
        errors.push({
          field: 'panNumber',
          message: 'Invalid PAN number format'
        });
      }
      
      // Validate passport number if present
      if (body.passportNumber && !Utils.validatePassportFormat(body.passportNumber)) {
        errors.push({
          field: 'passportNumber',
          message: 'Invalid passport number format'
        });
      }
      
      // Validate mobile number if present
      if (body.mobile && !Utils.validateMobileNumber(body.mobile)) {
        errors.push({
          field: 'mobile',
          message: 'Invalid mobile number format'
        });
      }
      
      // Validate email if present
      if (body.email && !Utils.validateEmail(body.email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format'
        });
      }
      
      // Validate date of birth if present
      if (body.dateOfBirth) {
        if (!Utils.validateDateFormat(body.dateOfBirth)) {
          errors.push({
            field: 'dateOfBirth',
            message: 'Invalid date format. Use YYYY-MM-DD'
          });
        } else {
          const age = Utils.calculateAge(body.dateOfBirth);
          if (age < 18) {
            errors.push({
              field: 'dateOfBirth',
              message: 'User must be at least 18 years old'
            });
          }
        }
      }
      
      if (errors.length > 0) {
        logger.warn('KYC field validation failed', {
          endpoint: req.path,
          errors,
          userId: req.user?.sub || req.user?.userId
        });
        
        return res.status(400).json({
          success: false,
          error: 'KYC field validation failed',
          details: errors
        });
      }
      
      next();
      
    } catch (validationError) {
      logger.error('KYC field validation middleware error:', validationError);
      return res.status(500).json({
        success: false,
        error: 'KYC validation service error'
      });
    }
  }
}

module.exports = new ValidationMiddleware();
