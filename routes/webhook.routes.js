const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const logger = require('../../shared/logger');
const redisManager = require('../../shared/redis');
const { supabase } = require('../../shared/supabase');

/**
 * Webhook handler for IDfy callbacks
 * This endpoint receives asynchronous updates from IDfy when KYC operations complete
 */

/**
 * Middleware to capture raw body for signature verification
 */
const captureRawBody = (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  
  req.on('data', (chunk) => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch (error) {
      logger.error('Invalid JSON in webhook payload:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload'
      });
    }
    next();
  });
};

/**
 * Verify IDfy webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from headers
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
function verifySignature(payload, signature, secret) {
  if (!signature || !secret) {
    logger.warn('Missing signature or secret for webhook verification');
    return false;
  }

  try {
    // IDfy uses HMAC-SHA256 for signature verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const providedSignature = signature.replace('sha256=', '');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Update KYC record in Supabase database
 * @param {string} taskId - Task ID from IDfy
 * @param {string} status - Verification status
 * @param {Object} result - Verification result data
 * @param {string} userId - User ID (if available)
 */
async function updateKYCRecord(taskId, status, result, userId = null) {
  try {
    // If we don't have userId, try to get it from Redis
    if (!userId) {
      const taskData = await redisManager.get(`kyc:task:${taskId}`);
      if (taskData && taskData.userId) {
        userId = taskData.userId;
      }
    }

    if (!userId) {
      logger.warn('No userId found for task:', { taskId });
      return;
    }

    // Update KYC record in Supabase
    const { data, error } = await supabase
      .from('kyc')
      .upsert({
        user_id: userId,
        task_id: taskId,
        status: status,
        verification_data: result,
        updated_at: new Date().toISOString(),
        provider: 'idfy'
      }, {
        onConflict: 'task_id'
      });

    if (error) {
      logger.error('Failed to update KYC record in Supabase:', error);
      throw error;
    }

    logger.info('KYC record updated successfully:', {
      userId,
      taskId,
      status
    });

    return data;
  } catch (error) {
    logger.error('Error updating KYC record:', error);
    throw error;
  }
}

/**
 * @route POST /api/kyc/webhook/idfy
 * @desc Handle IDfy webhook callbacks
 * @access Public (but signature verified)
 */
router.post('/idfy', captureRawBody, async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-idfy-signature'];
    const webhookSecret = process.env.IDFY_WEBHOOK_SECRET;

    logger.info('IDfy webhook received:', {
      headers: {
        signature: signature ? '[PRESENT]' : '[MISSING]',
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
      },
      bodyKeys: Object.keys(req.body || {})
    });

    // Verify webhook signature
    if (!verifySignature(req.rawBody, signature, webhookSecret)) {
      logger.warn('Invalid webhook signature:', {
        signature: signature ? '[REDACTED]' : '[MISSING]',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Parse webhook payload
    const { task_id, status, result, event_type, timestamp } = req.body;

    if (!task_id) {
      logger.error('Missing task_id in webhook payload:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Missing task_id'
      });
    }

    logger.info('Processing IDfy webhook:', {
      taskId: task_id,
      status,
      eventType: event_type,
      timestamp
    });

    // Update Redis cache with webhook result
    const taskKey = `kyc:task:${task_id}`;
    const existingTaskData = await redisManager.get(taskKey);
    
    if (existingTaskData) {
      await redisManager.set(
        taskKey,
        {
          ...existingTaskData,
          status,
          result,
          webhookReceived: true,
          webhookTimestamp: new Date().toISOString()
        },
        86400 // 24 hours expiry
      );
    }

    // Update database record
    await updateKYCRecord(task_id, status, result, existingTaskData?.userId);

    // Send success response to IDfy
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      task_id
    });

    logger.info('IDfy webhook processed successfully:', {
      taskId: task_id,
      status,
      eventType: event_type
    });

  } catch (error) {
    logger.error('Error processing IDfy webhook:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/kyc/webhook/health
 * @desc Health check endpoint for webhook service
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route POST /api/kyc/webhook/test
 * @desc Test endpoint for webhook functionality (development only)
 * @access Private
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  try {
    const { task_id, status = 'completed', result = {} } = req.body;

    if (!task_id) {
      return res.status(400).json({
        success: false,
        error: 'task_id is required'
      });
    }

    // Simulate webhook processing
    await updateKYCRecord(task_id, status, result);

    res.status(200).json({
      success: true,
      message: 'Test webhook processed',
      task_id,
      status
    });

  } catch (error) {
    logger.error('Error processing test webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
