/**
 * Shared Utilities for KYC/AML Microservices
 * Exports all shared utilities for use in microservices
 */

const logger = require('./logger');
const redisManager = require('./redis');
const queueManager = require('./queueManager');
const jobProcessors = require('./jobProcessors');
const supabaseManager = require('./supabase');
const utils = require('./utils');

module.exports = {
  logger,
  redisManager,
  queueManager,
  jobProcessors,
  supabaseManager,
  utils
};
