-- Supabase Migration for KYC/AML Enhanced Schema
-- Run this in Supabase SQL Editor or via CLI migration

-- First, create the enhanced KYC/AML tables
-- This extends the existing auth.users table with comprehensive KYC/AML support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types for better data integrity
CREATE TYPE kyc_status_enum AS ENUM ('pending', 'in_progress', 'verified', 'rejected', 'expired');
CREATE TYPE kyc_level_enum AS ENUM ('basic', 'intermediate', 'full');
CREATE TYPE risk_category_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE verification_method_enum AS ENUM ('otp', 'biometric', 'qr_code', 'offline_xml');
CREATE TYPE verification_status_enum AS ENUM ('pending', 'initiated', 'verified', 'failed', 'expired');
CREATE TYPE screening_type_enum AS ENUM ('sanctions', 'pep', 'adverse_media', 'comprehensive');
CREATE TYPE document_type_enum AS ENUM ('aadhaar', 'pan', 'passport', 'voter_id', 'driving_license', 'bank_statement', 'utility_bill');

-- Enhanced KYC Users Profile Table
CREATE TABLE IF NOT EXISTS public.kyc_user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Information (Encrypted using Supabase Vault)
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    nationality VARCHAR(3) DEFAULT 'IN',
    
    -- Contact Information
    phone VARCHAR(20),
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(3) DEFAULT 'IN',
    
    -- KYC Status and Levels
    kyc_status kyc_status_enum DEFAULT 'pending',
    kyc_level kyc_level_enum DEFAULT 'basic',
    kyc_completion_percentage INTEGER DEFAULT 0 CHECK (kyc_completion_percentage >= 0 AND kyc_completion_percentage <= 100),
    
    -- Risk and Compliance
    risk_category risk_category_enum DEFAULT 'low',
    risk_score DECIMAL(5,3) DEFAULT 0.000,
    pep_status BOOLEAN DEFAULT FALSE,
    sanctions_status BOOLEAN DEFAULT FALSE,
    
    -- Verification Flags
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    pan_verified BOOLEAN DEFAULT FALSE,
    passport_verified BOOLEAN DEFAULT FALSE,
    address_verified BOOLEAN DEFAULT FALSE,
    
    -- Important Dates
    kyc_initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    kyc_completed_at TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_review_due TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Aadhaar Verification Table
CREATE TABLE IF NOT EXISTS public.aadhaar_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Aadhaar Information (Store hash for indexing, encrypted number separately)
    aadhaar_hash VARCHAR(64) NOT NULL,
    aadhaar_masked VARCHAR(20), -- For display purposes (XXXX-XXXX-1234)
    
    -- Verification Process
    verification_method verification_method_enum NOT NULL,
    verification_status verification_status_enum DEFAULT 'pending',
    provider_reference_id VARCHAR(100),
    transaction_id VARCHAR(100),
    
    -- OTP Related Fields
    otp_request_id VARCHAR(100),
    otp_attempts INTEGER DEFAULT 0,
    max_otp_attempts INTEGER DEFAULT 3,
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Verification Results (Store encrypted in production)
    name_match_score INTEGER, -- Percentage match
    address_match_score INTEGER,
    dob_match_score INTEGER,
    
    -- Extracted KYC Data (Encrypted)
    extracted_name TEXT,
    extracted_dob DATE,
    extracted_gender VARCHAR(10),
    extracted_address TEXT,
    
    -- Compliance and Audit
    consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- PAN Verification Table
CREATE TABLE IF NOT EXISTS public.pan_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- PAN Information
    pan_hash VARCHAR(64) NOT NULL,
    pan_masked VARCHAR(15), -- For display (ABCDE****F)
    
    -- Verification Details
    verification_status verification_status_enum DEFAULT 'pending',
    provider_reference_id VARCHAR(100),
    nsdl_status VARCHAR(50),
    
    -- Verification Results
    name_on_pan TEXT,
    pan_status VARCHAR(20), -- Active, Inactive, etc.
    aadhaar_seeding_status BOOLEAN,
    
    -- Name Matching
    name_match_score INTEGER,
    
    -- Audit Fields
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- AML Screening Table
CREATE TABLE IF NOT EXISTS public.aml_screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Screening Configuration
    screening_type screening_type_enum NOT NULL,
    screening_status VARCHAR(20) DEFAULT 'pending',
    provider_name VARCHAR(50),
    provider_reference_id VARCHAR(100),
    
    -- Search Parameters
    search_name TEXT NOT NULL,
    search_country VARCHAR(3) DEFAULT 'IN',
    search_dob DATE,
    
    -- Results Summary
    total_matches INTEGER DEFAULT 0,
    high_risk_matches INTEGER DEFAULT 0,
    medium_risk_matches INTEGER DEFAULT 0,
    low_risk_matches INTEGER DEFAULT 0,
    
    -- Risk Assessment
    overall_risk_score DECIMAL(5,3) DEFAULT 0.000,
    risk_level risk_category_enum DEFAULT 'low',
    
    -- Lists Checked
    sanctions_lists_checked TEXT[],
    pep_lists_checked TEXT[],
    
    -- Compliance
    screening_required_by DATE,
    next_screening_due DATE DEFAULT (NOW() + INTERVAL '1 year'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    initiated_by UUID DEFAULT auth.uid(),
    automated_screening BOOLEAN DEFAULT FALSE
);

-- AML Screening Matches Detail Table
CREATE TABLE IF NOT EXISTS public.aml_screening_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL REFERENCES public.aml_screenings(id) ON DELETE CASCADE,
    
    -- Match Information
    match_type VARCHAR(20) NOT NULL, -- sanctions, pep, adverse_media
    matched_name TEXT NOT NULL,
    match_score DECIMAL(5,3) NOT NULL,
    confidence_level VARCHAR(10), -- low, medium, high
    
    -- Source Information
    source_list VARCHAR(100) NOT NULL,
    source_country VARCHAR(3),
    source_category VARCHAR(50),
    
    -- Match Details
    match_reason TEXT,
    additional_info JSONB,
    
    -- Review Status
    review_status VARCHAR(20) DEFAULT 'pending', -- pending, false_positive, confirmed, escalated
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Storage Table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Document Classification
    document_type document_type_enum NOT NULL,
    document_subtype VARCHAR(50), -- front, back, selfie, etc.
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    
    -- Storage (Using Supabase Storage)
    storage_bucket VARCHAR(100) DEFAULT 'kyc-documents',
    storage_path TEXT NOT NULL,
    
    -- Processing Status
    upload_status VARCHAR(20) DEFAULT 'uploaded',
    ocr_status VARCHAR(20) DEFAULT 'pending',
    verification_status VARCHAR(20) DEFAULT 'pending',
    
    -- OCR Results
    ocr_confidence DECIMAL(5,3),
    extracted_text TEXT,
    extracted_data JSONB,
    
    -- Verification Results
    document_quality_score INTEGER,
    authenticity_score INTEGER,
    verification_notes TEXT,
    
    -- Compliance
    retention_period INTERVAL DEFAULT INTERVAL '5 years',
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    uploaded_by UUID DEFAULT auth.uid(),
    verified_by UUID,
    ip_address INET
);

-- Comprehensive Audit Trail
CREATE TABLE IF NOT EXISTS public.kyc_aml_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Entity Reference
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    
    -- Action Details
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, VERIFY, SCREEN, etc.
    action_category VARCHAR(30) NOT NULL, -- kyc, aml, document, system
    
    -- Change Tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    reason TEXT,
    notes TEXT,
    
    -- Technical Details
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    api_endpoint VARCHAR(200),
    
    -- Compliance
    regulatory_basis VARCHAR(100), -- PMLA, UIDAI, RBI, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Actor
    performed_by UUID DEFAULT auth.uid(),
    performed_by_role VARCHAR(50) DEFAULT 'user'
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_user_id ON public.kyc_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_status ON public.kyc_user_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_risk ON public.kyc_user_profiles(risk_category);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_review_due ON public.kyc_user_profiles(next_review_due);

CREATE INDEX IF NOT EXISTS idx_aadhaar_user_id ON public.aadhaar_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_aadhaar_hash ON public.aadhaar_verifications(aadhaar_hash);
CREATE INDEX IF NOT EXISTS idx_aadhaar_status ON public.aadhaar_verifications(verification_status);

CREATE INDEX IF NOT EXISTS idx_pan_user_id ON public.pan_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pan_hash ON public.pan_verifications(pan_hash);

CREATE INDEX IF NOT EXISTS idx_aml_screenings_user_id ON public.aml_screenings(user_id);
CREATE INDEX IF NOT EXISTS idx_aml_screenings_type ON public.aml_screenings(screening_type);
CREATE INDEX IF NOT EXISTS idx_aml_screenings_due ON public.aml_screenings(next_screening_due);

CREATE INDEX IF NOT EXISTS idx_aml_matches_screening_id ON public.aml_screening_matches(screening_id);
CREATE INDEX IF NOT EXISTS idx_aml_matches_review ON public.aml_screening_matches(review_status);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.kyc_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.kyc_aml_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.kyc_aml_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.kyc_aml_audit_log(created_at);

-- Enable Row Level Security
ALTER TABLE public.kyc_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aadhaar_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pan_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_screening_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_aml_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user data access
CREATE POLICY "Users can manage their own KYC profile" ON public.kyc_user_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own Aadhaar verifications" ON public.aadhaar_verifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own PAN verifications" ON public.pan_verifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AML screenings" ON public.aml_screenings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AML matches" ON public.aml_screening_matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.aml_screenings 
            WHERE id = screening_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own documents" ON public.kyc_documents
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit log" ON public.kyc_aml_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
