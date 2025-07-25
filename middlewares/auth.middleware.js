const jwt = require('jsonwebtoken');
const logger = require('../../shared/logger');

class AuthMiddleware {
  /**
   * Authenticate API requests using API key or JWT token
   */
  authenticate(req, res, next) {
    try {
      // Check for API key in headers
      const apiKey = req.headers['x-api-key'];
      const authHeader = req.headers['authorization'];
      
      // Internal API key authentication
      if (apiKey) {
        if (apiKey !== process.env.INTERNAL_API_KEY) {
          logger.warn('Invalid API key attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
          });
          
          return res.status(403).json({
            success: false,
            error: 'Unauthorized access - Invalid API key'
          });
        }
        
        // Set user context for internal requests
        req.user = {
          type: 'internal',
          permissions: ['kyc:read', 'kyc:write', 'kyc:admin']
        };
        
        return next();
      }
      
      // JWT token authentication
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
          
          logger.info('JWT authentication successful', {
            userId: decoded.sub || decoded.userId,
            endpoint: req.path
          });
          
          return next();
          
        } catch (jwtError) {
          logger.warn('Invalid JWT token', {
            error: jwtError.message,
            ip: req.ip,
            endpoint: req.path
          });
          
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
          });
        }
      }
      
      // No authentication provided
      logger.warn('No authentication provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      
    } catch (error) {
      logger.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
    }
  }

  /**
   * Check if user has required permissions
   * @param {Array} requiredPermissions - Array of required permissions
   */
  authorize(requiredPermissions = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Internal requests have all permissions
        if (req.user.type === 'internal') {
          return next();
        }

        // Check user permissions
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          logger.warn('Insufficient permissions', {
            userId: req.user.sub || req.user.userId,
            required: requiredPermissions,
            available: userPermissions,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }

        next();

      } catch (error) {
        logger.error('Authorization middleware error:', error);
        return res.status(500).json({
          success: false,
          error: 'Authorization service error'
        });
      }
    };
  }

  /**
   * Rate limiting per user
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  userRateLimit(maxRequests = 10, windowMs = 60000) {
    const redisManager = require('../../shared/redis');
    
    return async (req, res, next) => {
      try {
        const userId = req.user?.sub || req.user?.userId || req.ip;
        const key = `rate_limit:user:${userId}`;
        
        const current = await redisManager.get(key) || 0;
        
        if (current >= maxRequests) {
          logger.warn('User rate limit exceeded', {
            userId,
            current,
            limit: maxRequests,
            endpoint: req.path
          });
          
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }
        
        // Increment counter
        await redisManager.set(key, current + 1, Math.ceil(windowMs / 1000));
        
        next();
        
      } catch (error) {
        logger.error('User rate limit middleware error:', error);
        // Don't block request on rate limit service error
        next();
      }
    };
  }

  /**
   * Validate user context for KYC operations
   */
  validateUserContext(req, res, next) {
    try {
      const { userId } = req.params;
      const requestUserId = req.user?.sub || req.user?.userId;
      
      // Internal requests can access any user
      if (req.user?.type === 'internal') {
        return next();
      }
      
      // Users can only access their own KYC data
      if (userId && requestUserId && userId !== requestUserId) {
        logger.warn('User context validation failed', {
          requestUserId,
          targetUserId: userId,
          endpoint: req.path
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access denied - Can only access own KYC data'
        });
      }
      
      next();
      
    } catch (error) {
      logger.error('User context validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'User validation service error'
      });
    }
  }

  /**
   * Log API access for audit purposes
   */
  auditLog(req, res, next) {
    const startTime = Date.now();
    
    // Log request
    logger.audit(
      req.user?.sub || req.user?.userId || 'anonymous',
      'API_ACCESS',
      'started',
      {
        method: req.method,
        endpoint: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }
    );
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      logger.audit(
        req.user?.sub || req.user?.userId || 'anonymous',
        'API_ACCESS',
        'completed',
        {
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode,
          duration,
          success: data?.success !== false,
          timestamp: new Date().toISOString()
        }
      );
      
      return originalJson.call(this, data);
    };
    
    next();
  }
}

module.exports = new AuthMiddleware();
