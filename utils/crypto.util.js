const crypto = require('crypto');
const logger = require('../../shared/logger');

/**
 * Cryptographic utilities for KYC service
 * Handles encryption, hashing, and secure data processing
 */
class CryptoUtil {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
  }

  /**
   * Generate a secure random key
   * @param {number} length - Key length in bytes
   * @returns {Buffer} Random key
   */
  generateKey(length = this.keyLength) {
    return crypto.randomBytes(length);
  }

  /**
   * Generate a secure random IV
   * @returns {Buffer} Random IV
   */
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Generate a secure random salt
   * @returns {Buffer} Random salt
   */
  generateSalt() {
    return crypto.randomBytes(this.saltLength);
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - Password to derive key from
   * @param {Buffer} salt - Salt for key derivation
   * @param {number} iterations - Number of iterations (default: 100000)
   * @returns {Buffer} Derived key
   */
  deriveKey(password, salt, iterations = 100000) {
    return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @param {string|Buffer} key - Encryption key
   * @returns {Object} Encrypted data with metadata
   */
  encrypt(plaintext, key = process.env.ENCRYPTION_KEY) {
    try {
      if (!key) {
        throw new Error('Encryption key not provided');
      }

      // Convert key to Buffer if it's a string
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      
      if (keyBuffer.length !== this.keyLength) {
        throw new Error(`Invalid key length. Expected ${this.keyLength} bytes`);
      }

      const iv = this.generateIV();
      const cipher = crypto.createCipher(this.algorithm, keyBuffer);
      cipher.setAAD(Buffer.from('kyc-service', 'utf8')); // Additional authenticated data

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   * @param {string|Buffer} key - Decryption key
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    try {
      if (!key) {
        throw new Error('Decryption key not provided');
      }

      if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Invalid encrypted data format');
      }

      // Convert key to Buffer if it's a string
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      
      if (keyBuffer.length !== this.keyLength) {
        throw new Error(`Invalid key length. Expected ${this.keyLength} bytes`);
      }

      const decipher = crypto.createDecipher(encryptedData.algorithm || this.algorithm, keyBuffer);
      decipher.setAAD(Buffer.from('kyc-service', 'utf8'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate hash for data integrity
   * @param {string} data - Data to hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hash in hex format
   */
  generateHash(data, algorithm = 'sha256') {
    try {
      return crypto.createHash(algorithm).update(data, 'utf8').digest('hex');
    } catch (error) {
      logger.error('Hash generation failed:', error);
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }

  /**
   * Generate HMAC for message authentication
   * @param {string} data - Data to authenticate
   * @param {string} secret - Secret key
   * @param {string} algorithm - HMAC algorithm (default: sha256)
   * @returns {string} HMAC in hex format
   */
  generateHMAC(data, secret, algorithm = 'sha256') {
    try {
      return crypto.createHmac(algorithm, secret).update(data, 'utf8').digest('hex');
    } catch (error) {
      logger.error('HMAC generation failed:', error);
      throw new Error(`HMAC generation failed: ${error.message}`);
    }
  }

  /**
   * Verify HMAC
   * @param {string} data - Original data
   * @param {string} hmac - HMAC to verify
   * @param {string} secret - Secret key
   * @param {string} algorithm - HMAC algorithm (default: sha256)
   * @returns {boolean} True if HMAC is valid
   */
  verifyHMAC(data, hmac, secret, algorithm = 'sha256') {
    try {
      const expectedHmac = this.generateHMAC(data, secret, algorithm);
      return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
    } catch (error) {
      logger.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Hash sensitive PII data for storage
   * @param {string} data - Sensitive data (Aadhaar, PAN, etc.)
   * @param {string} salt - Salt for hashing
   * @returns {Object} Hash result with metadata
   */
  hashPII(data, salt = null) {
    try {
      const saltBuffer = salt ? Buffer.from(salt, 'hex') : this.generateSalt();
      
      // Use PBKDF2 for PII hashing (more secure than simple hash)
      const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 32, 'sha256');
      
      return {
        hash: hash.toString('hex'),
        salt: saltBuffer.toString('hex'),
        algorithm: 'pbkdf2',
        iterations: 100000,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('PII hashing failed:', error);
      throw new Error(`PII hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify PII hash
   * @param {string} data - Original data
   * @param {Object} hashData - Hash data object
   * @returns {boolean} True if hash matches
   */
  verifyPIIHash(data, hashData) {
    try {
      if (!hashData || !hashData.hash || !hashData.salt) {
        return false;
      }

      const saltBuffer = Buffer.from(hashData.salt, 'hex');
      const iterations = hashData.iterations || 100000;
      
      const hash = crypto.pbkdf2Sync(data, saltBuffer, iterations, 32, 'sha256');
      const expectedHash = Buffer.from(hashData.hash, 'hex');
      
      return crypto.timingSafeEqual(hash, expectedHash);

    } catch (error) {
      logger.error('PII hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Random token in hex format
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   * @returns {string} UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Encrypt file data
   * @param {Buffer} fileBuffer - File buffer to encrypt
   * @param {string|Buffer} key - Encryption key
   * @returns {Object} Encrypted file data
   */
  encryptFile(fileBuffer, key = process.env.ENCRYPTION_KEY) {
    try {
      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('File data must be a Buffer');
      }

      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      const iv = this.generateIV();
      const cipher = crypto.createCipher(this.algorithm, keyBuffer);

      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        originalSize: fileBuffer.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('File encryption failed:', error);
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file data
   * @param {Object} encryptedFileData - Encrypted file data object
   * @param {string|Buffer} key - Decryption key
   * @returns {Buffer} Decrypted file buffer
   */
  decryptFile(encryptedFileData, key = process.env.ENCRYPTION_KEY) {
    try {
      if (!encryptedFileData || !encryptedFileData.encrypted) {
        throw new Error('Invalid encrypted file data');
      }

      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      const decipher = crypto.createDecipher(encryptedFileData.algorithm || this.algorithm, keyBuffer);
      
      decipher.setAuthTag(Buffer.from(encryptedFileData.authTag, 'hex'));

      const encrypted = Buffer.from(encryptedFileData.encrypted, 'base64');
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted;

    } catch (error) {
      logger.error('File decryption failed:', error);
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate digital signature
   * @param {string} data - Data to sign
   * @param {string} privateKey - Private key for signing
   * @returns {string} Digital signature
   */
  generateSignature(data, privateKey) {
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(data, 'utf8');
      return sign.sign(privateKey, 'hex');
    } catch (error) {
      logger.error('Signature generation failed:', error);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  /**
   * Verify digital signature
   * @param {string} data - Original data
   * @param {string} signature - Signature to verify
   * @param {string} publicKey - Public key for verification
   * @returns {boolean} True if signature is valid
   */
  verifySignature(data, signature, publicKey) {
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(data, 'utf8');
      return verify.verify(publicKey, signature, 'hex');
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Secure data comparison (timing-safe)
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings are equal
   */
  secureCompare(a, b) {
    try {
      if (a.length !== b.length) {
        return false;
      }
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch (error) {
      return false;
    }
  }
}

module.exports = new CryptoUtil();
