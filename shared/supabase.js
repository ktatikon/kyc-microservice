const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

/**
 * Supabase client configuration for KYC/AML services
 */
class SupabaseManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      });

      this.isConnected = true;
      logger.info('✅ Supabase client initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Get Supabase client instance
   * @returns {Object} Supabase client
   */
  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  /**
   * Insert KYC user profile
   * @param {Object} profileData - User profile data
   * @returns {Object} Insert result
   */
  async insertKYCProfile(profileData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('kyc_user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;

      logger.kyc(profileData.user_id, 'profile_created', 'success', {
        profileId: data.id
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to insert KYC profile:', error);
      throw error;
    }
  }

  /**
   * Update KYC user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Update result
   */
  async updateKYCProfile(userId, updateData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('kyc_user_profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      logger.kyc(userId, 'profile_updated', 'success', {
        updatedFields: Object.keys(updateData)
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to update KYC profile:', error);
      throw error;
    }
  }

  /**
   * Get KYC user profile
   * @param {string} userId - User ID
   * @returns {Object} User profile
   */
  async getKYCProfile(userId) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('kyc_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to get KYC profile:', error);
      throw error;
    }
  }

  /**
   * Insert Aadhaar verification record
   * @param {Object} verificationData - Aadhaar verification data
   * @returns {Object} Insert result
   */
  async insertAadhaarVerification(verificationData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('aadhaar_verifications')
        .insert(verificationData)
        .select()
        .single();

      if (error) throw error;

      logger.kyc(verificationData.user_id, 'aadhaar_verification_initiated', 'success', {
        verificationId: data.id,
        method: verificationData.verification_method
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to insert Aadhaar verification:', error);
      throw error;
    }
  }

  /**
   * Update Aadhaar verification status
   * @param {string} verificationId - Verification ID
   * @param {Object} updateData - Update data
   * @returns {Object} Update result
   */
  async updateAadhaarVerification(verificationId, updateData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('aadhaar_verifications')
        .update(updateData)
        .eq('id', verificationId)
        .select()
        .single();

      if (error) throw error;

      logger.kyc(data.user_id, 'aadhaar_verification_updated', 'success', {
        verificationId,
        status: updateData.verification_status
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to update Aadhaar verification:', error);
      throw error;
    }
  }

  /**
   * Insert PAN verification record
   * @param {Object} verificationData - PAN verification data
   * @returns {Object} Insert result
   */
  async insertPANVerification(verificationData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('pan_verifications')
        .insert(verificationData)
        .select()
        .single();

      if (error) throw error;

      logger.kyc(verificationData.user_id, 'pan_verification_initiated', 'success', {
        verificationId: data.id
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to insert PAN verification:', error);
      throw error;
    }
  }

  /**
   * Insert AML screening record
   * @param {Object} screeningData - AML screening data
   * @returns {Object} Insert result
   */
  async insertAMLScreening(screeningData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('aml_screenings')
        .insert(screeningData)
        .select()
        .single();

      if (error) throw error;

      logger.aml(screeningData.user_id, 'screening_initiated', 'success', {
        screeningId: data.id,
        type: screeningData.screening_type
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to insert AML screening:', error);
      throw error;
    }
  }

  /**
   * Insert AML screening matches
   * @param {Array} matches - Array of match objects
   * @returns {Object} Insert result
   */
  async insertAMLMatches(matches) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('aml_screening_matches')
        .insert(matches)
        .select();

      if (error) throw error;

      logger.aml('system', 'matches_recorded', 'success', {
        matchCount: matches.length
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to insert AML matches:', error);
      throw error;
    }
  }

  /**
   * Insert audit log entry
   * @param {Object} auditData - Audit log data
   * @returns {Object} Insert result
   */
  async insertAuditLog(auditData) {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('kyc_aml_audit_log')
        .insert(auditData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to insert audit log:', error);
      throw error;
    }
  }

  /**
   * Health check for Supabase connection
   * @returns {boolean} True if healthy
   */
  async healthCheck() {
    try {
      if (!this.isConnected) return false;

      const client = this.getClient();
      const { error } = await client
        .from('kyc_user_profiles')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      logger.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const supabaseManager = new SupabaseManager();

module.exports = supabaseManager;
