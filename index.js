require('dotenv').config({ path: '../.env' });
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('../shared/logger');
const redisManager = require('../shared/redis');

const app = express();
const PORT = process.env.KYC_SERVICE_PORT || 4001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration for local network access
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost and local network IPs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];

    // Allow any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkRegex = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.).*/;

    if (allowedOrigins.includes(origin) || localNetworkRegex.test(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

app.use(limiter);

// Strict rate limiting for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 requests per 5 minutes
  message: {
    error: 'Too many verification attempts, please try again later.',
    retryAfter: '5 minutes'
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await redisManager.healthCheck();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'kyc-service',
      version: '1.0.0',
      uptime: process.uptime(),
      redis: redisHealth ? 'connected' : 'disconnected'
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'kyc-service',
      error: 'Service unavailable'
    });
  }
});

// Import routes
const kycRoutes = require('./routes/kyc.routes');
const aadhaarRoutes = require('./routes/aadhaar.routes');
const panRoutes = require('./routes/pan.routes');
const passportRoutes = require('./routes/passport.routes');
const biometricRoutes = require('./routes/biometric.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Apply routes
app.use('/api/kyc', kycRoutes);
app.use('/api/kyc/aadhaar', strictLimiter, aadhaarRoutes);
app.use('/api/kyc/pan', strictLimiter, panRoutes);
app.use('/api/kyc/passport', strictLimiter, passportRoutes);
app.use('/api/kyc/biometric', strictLimiter, biometricRoutes);
app.use('/api/kyc/webhook', webhookRoutes); // No rate limiting for webhooks

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  try {
    await redisManager.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  try {
    await redisManager.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Initialize service
async function startService() {
  try {
    // Initialize Redis
    await redisManager.initialize();
    
    // Start server on all interfaces for local network access
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ KYC service running on port ${PORT}`);
      logger.info(`🌐 Accessible on local network at http://0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Redis: ${redisManager.isConnected ? 'Connected' : 'Disconnected'}`);
    });
    
  } catch (error) {
    logger.error('Failed to start KYC service:', error);
    process.exit(1);
  }
}

// Start the service
startService();

module.exports = app;
