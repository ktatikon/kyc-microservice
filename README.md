# 🔐 KYC Microservice - Standalone Repository

## 📋 Overview

The KYC (Know Your Customer) Microservice is a comprehensive, production-ready service for handling KYC verification processes with full Indian regulatory compliance (PMLA, UIDAI, RBI, SEBI). This service provides Aadhaar eKYC, PAN verification, document processing, and AML screening capabilities.

## 🚀 Features

### Core KYC Services
- **Aadhaar eKYC**: OTP and biometric verification via UIDAI
- **PAN Verification**: Real-time PAN validation via NSDL
- **Passport Verification**: Document validation and OCR
- **Document Processing**: OCR, validation, and storage
- **Biometric Verification**: Fingerprint and face matching

### Compliance & Security
- **Indian Regulatory Compliance**: PMLA, UIDAI, RBI, SEBI
- **Data Encryption**: End-to-end encryption for sensitive data
- **Audit Trails**: Comprehensive logging and audit trails
- **Data Retention**: 5-year compliance data retention
- **Row Level Security**: Database-level access control

### Integration Features
- **IDfy Integration**: Production-ready IDfy API integration
- **Webhook Support**: Real-time status updates
- **Queue Processing**: Background job processing with Bull
- **Redis Caching**: High-performance caching layer
- **Supabase Integration**: Modern database with real-time features

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- Redis Server
- PostgreSQL/Supabase Database
- IDfy API Credentials

### Installation Steps

1. **Clone and Install Dependencies**
```bash
git clone https://github.com/ktatikon/kyc-microservice.git
cd kyc-microservice
npm install
```

2. **Database Setup**
```bash
# Run the database migration
psql -d your_database -f database/supabase_migration.sql
```

3. **Start the Service**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

### Core Endpoints

#### Aadhaar Verification
```bash
# Initiate Aadhaar OTP
POST /api/kyc/aadhaar/otp
{
  "aadhaarNumber": "123456789012"
}

# Verify Aadhaar OTP
POST /api/kyc/aadhaar/verify-otp
{
  "referenceId": "ref_123",
  "otp": "123456"
}
```

#### PAN Verification
```bash
# Verify PAN
POST /api/kyc/pan/verify
{
  "panNumber": "ABCDE1234F",
  "name": "John Doe"
}
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Test IDfy integration
node test-idfy-integration.js

# Test API endpoints
node test-api-direct.js
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t kyc-microservice .

# Run container
docker run -p 4001:4001 --env-file .env kyc-microservice
```

## 📞 Support

### Documentation
- **Integration Guide**: See `IDFY_INTEGRATION.md`
- **Technical Documentation**: See `V-DEX_KYC_AML_Complete_Technical_Documentation.md`

### Contact
- **Email**: dev@techvitta.com
- **GitHub Issues**: https://github.com/ktatikon/kyc-microservice/issues

---

**Status**: ✅ Production Ready  
**Compliance**: PMLA, UIDAI, RBI, SEBI  
**Security**: Enterprise Grade
