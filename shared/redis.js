const Redis = require('ioredis');
const logger = require('./logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connections
   */
  async initialize() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };

      // Main Redis client
      this.client = new Redis(redisConfig);
      
      // Subscriber client for pub/sub
      this.subscriber = new Redis(redisConfig);
      
      // Publisher client for pub/sub
      this.publisher = new Redis(redisConfig);

      // Set up event handlers
      this.setupEventHandlers();

      // Connect to Redis
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      this.isConnected = true;
      logger.info('✅ Redis connections established successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Redis connections:', error);
      throw error;
    }
  }

  /**
   * Set up Redis event handlers
   */
  setupEventHandlers() {
    const clients = [
      { name: 'main', client: this.client },
      { name: 'subscriber', client: this.subscriber },
      { name: 'publisher', client: this.publisher }
    ];

    clients.forEach(({ name, client }) => {
      client.on('connect', () => {
        logger.info(`Redis ${name} client connected`);
      });

      client.on('ready', () => {
        logger.info(`Redis ${name} client ready`);
      });

      client.on('error', (error) => {
        logger.error(`Redis ${name} client error:`, error);
      });

      client.on('close', () => {
        logger.warn(`Redis ${name} client connection closed`);
        this.isConnected = false;
      });

      client.on('reconnecting', () => {
        logger.info(`Redis ${name} client reconnecting...`);
      });
    });
  }

  /**
   * Get Redis client
   * @returns {Redis} Redis client instance
   */
  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not initialized or not connected');
    }
    return this.client;
  }

  /**
   * Get subscriber client
   * @returns {Redis} Redis subscriber client
   */
  getSubscriber() {
    if (!this.isConnected || !this.subscriber) {
      throw new Error('Redis subscriber not initialized or not connected');
    }
    return this.subscriber;
  }

  /**
   * Get publisher client
   * @returns {Redis} Redis publisher client
   */
  getPublisher() {
    if (!this.isConnected || !this.publisher) {
      throw new Error('Redis publisher not initialized or not connected');
    }
    return this.publisher;
  }

  /**
   * Set key-value pair with optional expiration
   * @param {string} key - Redis key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = null) {
    try {
      const client = this.getClient();
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await client.setex(key, ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      
      logger.debug(`Redis SET: ${key}`);
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key
   * @param {string} key - Redis key
   * @returns {any} Parsed value or null
   */
  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      
      if (value === null) {
        return null;
      }
      
      logger.debug(`Redis GET: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key
   * @param {string} key - Redis key
   */
  async del(key) {
    try {
      const client = this.getClient();
      await client.del(key);
      logger.debug(`Redis DEL: ${key}`);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Redis key
   * @returns {boolean} True if key exists
   */
  async exists(key) {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration for key
   * @param {string} key - Redis key
   * @param {number} ttl - Time to live in seconds
   */
  async expire(key, ttl) {
    try {
      const client = this.getClient();
      await client.expire(key, ttl);
      logger.debug(`Redis EXPIRE: ${key} (${ttl}s)`);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Publish message to channel
   * @param {string} channel - Channel name
   * @param {any} message - Message to publish
   */
  async publish(channel, message) {
    try {
      const publisher = this.getPublisher();
      const serializedMessage = JSON.stringify(message);
      await publisher.publish(channel, serializedMessage);
      logger.debug(`Redis PUBLISH: ${channel}`);
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   * @param {string} channel - Channel name
   * @param {Function} callback - Message handler
   */
  async subscribe(channel, callback) {
    try {
      const subscriber = this.getSubscriber();
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            logger.error(`Error parsing message from channel ${channel}:`, error);
          }
        }
      });

      await subscriber.subscribe(channel);
      logger.info(`Subscribed to Redis channel: ${channel}`);
    } catch (error) {
      logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Close all Redis connections
   */
  async close() {
    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      
      this.isConnected = false;
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }

  /**
   * Health check
   * @returns {boolean} True if Redis is healthy
   */
  async healthCheck() {
    try {
      if (!this.isConnected) return false;
      
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const redisManager = new RedisManager();

module.exports = redisManager;
