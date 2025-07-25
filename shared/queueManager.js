const Bull = require('bull');
const logger = require('./logger');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };
    
    this.defaultJobOptions = {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50,      // Keep last 50 failed jobs
      attempts: 3,           // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };
  }

  /**
   * Create or get a queue
   */
  getQueue(queueName, options = {}) {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName);
    }

    const queue = new Bull(queueName, {
      redis: this.redisConfig,
      defaultJobOptions: { ...this.defaultJobOptions, ...options },
    });

    // Add global error handlers
    queue.on('error', (error) => {
      logger.error(`Queue ${queueName} error:`, error);
    });

    queue.on('waiting', (jobId) => {
      logger.info(`Job ${jobId} is waiting in queue ${queueName}`);
    });

    queue.on('active', (job) => {
      logger.info(`Job ${job.id} started processing in queue ${queueName}`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed in queue ${queueName}`, { result });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed in queue ${queueName}:`, error);
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue ${queueName}`);
    });

    this.queues.set(queueName, queue);
    logger.info(`Queue ${queueName} created successfully`);
    
    return queue;
  }

  /**
   * Add job to queue
   */
  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.add(jobType, data, {
        ...this.defaultJobOptions,
        ...options,
      });

      logger.info(`Job ${job.id} added to queue ${queueName}`, {
        jobType,
        jobId: job.id,
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Process jobs in queue
   */
  process(queueName, jobType, concurrency, processor) {
    try {
      const queue = this.getQueue(queueName);
      
      if (typeof concurrency === 'function') {
        // If concurrency is not provided, use the function as processor
        processor = concurrency;
        concurrency = 1;
      }

      queue.process(jobType, concurrency, async (job) => {
        try {
          logger.info(`Processing job ${job.id} of type ${jobType}`, {
            jobId: job.id,
            jobType,
            data: job.data,
          });

          const result = await processor(job);
          
          logger.info(`Job ${job.id} processed successfully`, {
            jobId: job.id,
            result,
          });

          return result;
        } catch (error) {
          logger.error(`Job ${job.id} processing failed:`, error);
          throw error;
        }
      });

      logger.info(`Processor registered for queue ${queueName}, job type ${jobType}`);
    } catch (error) {
      logger.error(`Failed to register processor for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    try {
      const queue = this.getQueue(queueName);
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      logger.error(`Failed to get stats for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Clean queue
   */
  async cleanQueue(queueName, grace = 0, status = 'completed') {
    try {
      const queue = this.getQueue(queueName);
      const result = await queue.clean(grace, status);
      
      logger.info(`Cleaned ${result.length} ${status} jobs from queue ${queueName}`);
      return result;
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.pause();
      logger.info(`Queue ${queueName} paused`);
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      await queue.resume();
      logger.info(`Queue ${queueName} resumed`);
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);
      return job;
    } catch (error) {
      logger.error(`Failed to get job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Remove job by ID
   */
  async removeJob(queueName, jobId) {
    try {
      const job = await this.getJob(queueName, jobId);
      if (job) {
        await job.remove();
        logger.info(`Job ${jobId} removed from queue ${queueName}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to remove job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close all queues
   */
  async closeAll() {
    try {
      const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
      await Promise.all(closePromises);
      
      this.queues.clear();
      logger.info('All queues closed successfully');
    } catch (error) {
      logger.error('Failed to close queues:', error);
      throw error;
    }
  }

  /**
   * Health check for all queues
   */
  async healthCheck() {
    try {
      const queueNames = Array.from(this.queues.keys());
      const healthChecks = await Promise.all(
        queueNames.map(async (queueName) => {
          try {
            const stats = await this.getQueueStats(queueName);
            return {
              queueName,
              healthy: true,
              stats,
            };
          } catch (error) {
            return {
              queueName,
              healthy: false,
              error: error.message,
            };
          }
        })
      );

      const allHealthy = healthChecks.every(check => check.healthy);
      
      return {
        healthy: allHealthy,
        queues: healthChecks,
      };
    } catch (error) {
      logger.error('Queue health check failed:', error);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const queueManager = new QueueManager();

module.exports = queueManager;
