-- KYC/AML Enhanced Database Schema for Indian Compliance
-- Supports PMLA, UIDAI, RBI/SEBI regulations with 5-year data retention

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- KYC Users Table (Enhanced)
CREATE TABLE kyc_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Information (Encrypted)
    full_name_encrypted TEXT NOT NULL,
    date_of_birth_encrypted TEXT,
    gender VARCHAR(10),
    nationality VARCHAR(3) DEFAULT 'IN',
    
    -- Contact Information (Encrypted)
    email_encrypted TEXT,
    phone_encrypted TEXT,
    address_encrypted TEXT,
    
    -- KYC Status
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_progress', 'verified', 'rejected', 'expired')),
    kyc_level VARCHAR(10) DEFAULT 'basic' CHECK (kyc_level IN ('basic', 'intermediate', 'full')),
    
    -- Compliance Fields
    risk_category VARCHAR(10) DEFAULT 'low' CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
    pep_status BOOLEAN DEFAULT FALSE,
    sanctions_status BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_by UUID,
    updated_by UUID,
    
    UNIQUE(user_id)
);

-- Aadhaar Verification Records
CREATE TABLE aadhaar_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES kyc_users(user_id) ON DELETE CASCADE,
    
    -- Aadhaar Details (Encrypted)
    aadhaar_number_encrypted TEXT NOT NULL,
    aadhaar_name_encrypted TEXT,
    
    -- Verification Status
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'initiated', 'verified', 'failed', 'expired')),
    verification_method VARCHAR(20) DEFAULT 'otp' CHECK (verification_method IN ('otp', 'biometric', 'offline')),
    
    -- UIDAI Response Data (Encrypted)
    uidai_reference_id TEXT,
    uidai_response_encrypted TEXT,
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
    
    -- Audit Fields
    ip_address INET,
    user_agent TEXT,
    created_by UUID,
    
    INDEX(user_id),
    INDEX(verification_status),
    INDEX(expires_at)
);

-- PAN Verification Records
CREATE TABLE pan_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES kyc_users(user_id) ON DELETE CASCADE,
    
    -- PAN Details (Encrypted)
    pan_number_encrypted TEXT NOT NULL,
    pan_name_encrypted TEXT,
    
    -- Verification Status
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'invalid')),
    
    -- Income Tax Department Response (Encrypted)
    itd_reference_id TEXT,
    itd_response_encrypted TEXT,
    
    -- Timestamps
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
    
    -- Audit Fields
    created_by UUID,
    
    INDEX(user_id),
    INDEX(verification_status)
);

-- Document Uploads
CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES kyc_users(user_id) ON DELETE CASCADE,
    
    -- Document Details
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('aadhaar_front', 'aadhaar_back', 'pan_card', 'passport', 'driving_license', 'voter_id', 'bank_statement', 'utility_bill', 'selfie')),
    document_category VARCHAR(20) NOT NULL CHECK (document_category IN ('identity', 'address', 'income', 'photo')),
    
    -- File Information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash TEXT, -- SHA-256 hash for integrity
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'verified', 'rejected', 'expired')),
    
    -- OCR/AI Analysis Results (Encrypted)
    extracted_data_encrypted TEXT,
    confidence_score DECIMAL(3,2),
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 years'),
    
    -- Audit Fields
    uploaded_by UUID,
    processed_by UUID,
    
    INDEX(user_id),
    INDEX(document_type),
    INDEX(processing_status)
);

-- AML Screening Records
CREATE TABLE aml_screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES kyc_users(user_id) ON DELETE CASCADE,
    
    -- Screening Details
    screening_type VARCHAR(30) NOT NULL CHECK (screening_type IN ('pep', 'sanctions', 'adverse_media', 'enhanced_due_diligence')),
    screening_provider VARCHAR(50) NOT NULL,
    
    -- Screening Results
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    match_found BOOLEAN DEFAULT FALSE,
    
    -- Match Details (Encrypted if sensitive)
    match_details_encrypted TEXT,
    false_positive BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    screened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '6 months'),
    
    -- Audit Fields
    screened_by UUID,
    reviewed_by UUID,
    review_notes TEXT,
    
    INDEX(user_id),
    INDEX(screening_type),
    INDEX(risk_level),
    INDEX(screened_at)
);

-- Transaction Monitoring (for ongoing AML compliance)
CREATE TABLE transaction_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES kyc_users(user_id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    
    -- Risk Assessment
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors TEXT[], -- Array of risk factors identified
    
    -- Monitoring Status
    monitoring_status VARCHAR(20) DEFAULT 'normal' CHECK (monitoring_status IN ('normal', 'flagged', 'suspicious', 'reported')),
    
    -- Regulatory Reporting
    str_filed BOOLEAN DEFAULT FALSE, -- Suspicious Transaction Report
    ctr_filed BOOLEAN DEFAULT FALSE, -- Currency Transaction Report
    
    -- Timestamps
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    monitored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit Fields
    flagged_by UUID,
    reviewed_by UUID,
    
    INDEX(user_id),
    INDEX(transaction_date),
    INDEX(monitoring_status),
    INDEX(risk_score)
);

-- Compliance Audit Trail
CREATE TABLE compliance_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES kyc_users(user_id) ON DELETE CASCADE,
    
    -- Audit Details
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Timestamps
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit Fields
    performed_by UUID NOT NULL,
    
    INDEX(user_id),
    INDEX(action_type),
    INDEX(action_timestamp),
    INDEX(performed_by)
);

-- RLS Policies for Security
ALTER TABLE kyc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE aadhaar_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pan_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_trail ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY "Users can view own KYC data" ON kyc_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own KYC data" ON kyc_users FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own Aadhaar verifications" ON aadhaar_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own Aadhaar verifications" ON aadhaar_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own PAN verifications" ON pan_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own PAN verifications" ON pan_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own documents" ON kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own documents" ON kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own AML screenings" ON aml_screenings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transaction monitoring" ON transaction_monitoring FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (for compliance officers)
CREATE POLICY "Admins can view all KYC data" ON kyc_users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
);

-- Functions for data retention (5-year compliance requirement)
CREATE OR REPLACE FUNCTION cleanup_expired_kyc_data()
RETURNS void AS $$
BEGIN
    -- Archive expired records before deletion
    INSERT INTO kyc_data_archive 
    SELECT * FROM kyc_users WHERE expires_at < NOW() - INTERVAL '5 years';
    
    -- Delete expired records
    DELETE FROM kyc_users WHERE expires_at < NOW() - INTERVAL '5 years';
    DELETE FROM aadhaar_verifications WHERE expires_at < NOW() - INTERVAL '5 years';
    DELETE FROM pan_verifications WHERE expires_at < NOW() - INTERVAL '5 years';
    DELETE FROM kyc_documents WHERE expires_at < NOW() - INTERVAL '5 years';
    DELETE FROM aml_screenings WHERE expires_at < NOW() - INTERVAL '5 years';
    DELETE FROM transaction_monitoring WHERE transaction_date < NOW() - INTERVAL '5 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup function (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-kyc-data', '0 2 * * 0', 'SELECT cleanup_expired_kyc_data();');

-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_kyc_users_status ON kyc_users(kyc_status);
CREATE INDEX CONCURRENTLY idx_kyc_users_risk ON kyc_users(risk_category);
CREATE INDEX CONCURRENTLY idx_kyc_users_created ON kyc_users(created_at);

CREATE INDEX CONCURRENTLY idx_aadhaar_status ON aadhaar_verifications(verification_status);
CREATE INDEX CONCURRENTLY idx_aadhaar_expires ON aadhaar_verifications(expires_at);

CREATE INDEX CONCURRENTLY idx_documents_type ON kyc_documents(document_type);
CREATE INDEX CONCURRENTLY idx_documents_status ON kyc_documents(processing_status);

CREATE INDEX CONCURRENTLY idx_aml_risk ON aml_screenings(risk_level);
CREATE INDEX CONCURRENTLY idx_aml_expires ON aml_screenings(expires_at);

CREATE INDEX CONCURRENTLY idx_transaction_date ON transaction_monitoring(transaction_date);
CREATE INDEX CONCURRENTLY idx_transaction_status ON transaction_monitoring(monitoring_status);

CREATE INDEX CONCURRENTLY idx_audit_timestamp ON compliance_audit_trail(action_timestamp);
CREATE INDEX CONCURRENTLY idx_audit_action ON compliance_audit_trail(action_type);

-- Comments for documentation
COMMENT ON TABLE kyc_users IS 'Main KYC user records with encrypted PII data';
COMMENT ON TABLE aadhaar_verifications IS 'Aadhaar verification records for Indian users';
COMMENT ON TABLE pan_verifications IS 'PAN card verification records';
COMMENT ON TABLE kyc_documents IS 'Uploaded KYC documents with processing status';
COMMENT ON TABLE aml_screenings IS 'AML screening results for compliance';
COMMENT ON TABLE transaction_monitoring IS 'Transaction monitoring for ongoing AML compliance';
COMMENT ON TABLE compliance_audit_trail IS 'Audit trail for all compliance-related actions';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON kyc_users TO authenticated;
GRANT SELECT, INSERT ON aadhaar_verifications TO authenticated;
GRANT SELECT, INSERT ON pan_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON kyc_documents TO authenticated;
GRANT SELECT ON aml_screenings TO authenticated;
GRANT SELECT ON transaction_monitoring TO authenticated;
GRANT SELECT ON compliance_audit_trail TO authenticated;

-- Service role permissions for microservices
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
