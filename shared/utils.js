const crypto = require('crypto');
const logger = require('./logger');

/**
 * Utility functions for KYC/AML services
 */
class Utils {
  /**
   * Validate Aadhaar number format
   * @param {string} aadhaar - Aadhaar number
   * @returns {boolean} True if valid format
   */
  static validateAadhaarFormat(aadhaar) {
    if (!aadhaar || typeof aadhaar !== 'string') return false;

    // Remove spaces and hyphens
    const cleanAadhaar = aadhaar.replace(/[\s-]/g, '');

    // Check if it's 12 digits
    if (!/^\d{12}$/.test(cleanAadhaar)) return false;

    // Aadhaar should not start with 0 or 1
    if (cleanAadhaar.startsWith('0') || cleanAadhaar.startsWith('1')) return false;

    // For testing purposes, skip Verhoeff validation if in development mode
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_AADHAAR_CHECKSUM === 'true') {
      return true; // Skip checksum validation for testing
    }

    // Verhoeff algorithm validation (simplified)
    return this.verhoeffCheck(cleanAadhaar);
  }

  /**
   * Validate PAN number format
   * @param {string} pan - PAN number
   * @returns {boolean} True if valid format
   */
  static validatePANFormat(pan) {
    if (!pan || typeof pan !== 'string') return false;
    
    // PAN format: ABCDE1234F (5 letters, 4 digits, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  }

  /**
   * Validate passport number format
   * @param {string} passport - Passport number
   * @returns {boolean} True if valid format
   */
  static validatePassportFormat(passport) {
    if (!passport || typeof passport !== 'string') return false;
    
    // Indian passport format: A1234567 or AB1234567
    const passportRegex = /^[A-Z]{1,2}[0-9]{7}$/;
    return passportRegex.test(passport.toUpperCase());
  }

  /**
   * Mask sensitive data for display
   * @param {string} data - Data to mask
   * @param {number} visibleStart - Number of characters to show at start
   * @param {number} visibleEnd - Number of characters to show at end
   * @returns {string} Masked data
   */
  static maskSensitiveData(data, visibleStart = 2, visibleEnd = 2) {
    if (!data || typeof data !== 'string') return '***';
    
    if (data.length <= visibleStart + visibleEnd) {
      return '*'.repeat(data.length);
    }
    
    const start = data.substring(0, visibleStart);
    const end = data.substring(data.length - visibleEnd);
    const middle = '*'.repeat(data.length - visibleStart - visibleEnd);
    
    return start + middle + end;
  }

  /**
   * Generate unique reference ID
   * @param {string} prefix - Prefix for the ID
   * @returns {string} Unique reference ID
   */
  static generateReferenceId(prefix = 'REF') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {string} Encrypted data
   */
  static encrypt(data, key = process.env.ENCRYPTION_KEY) {
    if (!key) throw new Error('Encryption key not provided');
    
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data
   * @param {string} key - Decryption key
   * @returns {string} Decrypted data
   */
  static decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    if (!key) throw new Error('Decryption key not provided');
    
    try {
      const algorithm = 'aes-256-gcm';
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Hash data using SHA-256
   * @param {string} data - Data to hash
   * @returns {string} Hashed data
   */
  static hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate OTP
   * @param {number} length - OTP length
   * @returns {string} Generated OTP
   */
  static generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} True if valid
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (Indian)
   * @param {string} phone - Phone number
   * @returns {boolean} True if valid
   */
  static validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    // Remove spaces, hyphens, and plus signs
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    
    // Indian phone number: 10 digits starting with 6-9, or with country code
    const phoneRegex = /^(?:91)?[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Calculate name similarity score
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} Similarity score (0-100)
   */
  static calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;
    
    const clean1 = name1.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const clean2 = name2.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    
    if (clean1 === clean2) return 100;
    
    // Simple Levenshtein distance calculation
    const matrix = [];
    const len1 = clean1.length;
    const len2 = clean2.length;
    
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (clean2.charAt(i - 1) === clean1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    const similarity = ((maxLength - distance) / maxLength) * 100;
    
    return Math.round(similarity);
  }

  /**
   * Simplified Verhoeff check for Aadhaar
   * @param {string} aadhaar - Clean Aadhaar number
   * @returns {boolean} True if valid
   */
  static verhoeffCheck(aadhaar) {
    // Simplified implementation - in production, use proper Verhoeff algorithm
    // For now, just check basic patterns
    const digits = aadhaar.split('').map(Number);
    const sum = digits.reduce((acc, digit, index) => acc + digit * (index + 1), 0);
    return sum % 10 !== 0; // Simplified check
  }

  /**
   * Format date for display
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  static formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Sanitize input data
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Check if date is within valid range
   * @param {Date|string} date - Date to check
   * @param {number} minYearsAgo - Minimum years ago
   * @param {number} maxYearsAgo - Maximum years ago
   * @returns {boolean} True if valid
   */
  static isValidDateRange(date, minYearsAgo = 18, maxYearsAgo = 100) {
    if (!date) return false;
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    
    const now = new Date();
    const minDate = new Date(now.getFullYear() - maxYearsAgo, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() - minYearsAgo, now.getMonth(), now.getDate());
    
    return d >= minDate && d <= maxDate;
  }
}

module.exports = Utils;
