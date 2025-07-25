# IDfy API Integration Guide - UPDATED

## Overview

This document describes the IDfy API integration status for KYC verification in the V-DEX mobile application. The integration has been systematically tested and configured with the correct endpoints and authentication.

## ✅ RESOLVED CONFIGURATION ISSUES

### Correct API Configuration

```bash
# IDfy API Configuration (CORRECTED)
IDFY_API_KEY=e443e8cc-47ca-47e8-b0f3-da146040dd59
IDFY_ACCOUNT_ID=ce21c1e41d97/c29e3af4-67ba-41e2-b550-6d0c742d64dc
IDFY_BASE_URL=https://api.idfy.com
IDFY_WEBHOOK_SECRET=your_webhook_secret_here

# Additional credentials (if needed)
IDFY_USERNAME=krishna.deepak@techivtta.in
IDFY_PASSWORD=hattyw-xudnyp-rAffe9

# Testing configuration
SKIP_AADHAAR_CHECKSUM=true

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🔍 SYSTEMATIC TESTING RESULTS

### ✅ Successfully Resolved Issues

1. **Base URL Discovery**
   - ❌ `https://eve.idfy.com` - Returns 404 for all endpoints
   - ❌ `https://apicentral.idfy.com` - Web dashboard, not API
   - ✅ `https://api.idfy.com` - **CORRECT API BASE URL**

2. **Authentication Method**
   - ❌ `X-API-Key` header - Returns 401 Unauthorized
   - ❌ `Bearer` token - Returns 403 Forbidden
   - ❌ Basic authentication - Returns 500 Server Error
   - ✅ `api-key` + `account-id` headers - **WORKING AUTHENTICATION**

3. **Endpoint Discovery**
   - ✅ `/v3/tasks/sync/verify_with_source/ind_pan` - PAN verification (responds)
   - ✅ `/v3/tasks/sync/verify_with_source/ind_passport` - Passport verification (responds)
   - ❌ `/v3/tasks/async/verify_with_source/ind_aadhaar_otp` - Returns 404 (wrong pattern)

4. **Infrastructure Setup**
   - ✅ Redis integration working
   - ✅ Supabase client configured
   - ✅ Webhook handler created
   - ✅ Aadhaar validation bypass for testing
   - ✅ Environment configuration updated

### ⚠️ Remaining Issue: Payload Format

**Current Status**: API endpoints respond but return "400 Bad Request" for all payload formats tested.

**Tested Formats** (all failed):
```json
// Format 1: Nested data
{
  "task_id": "pan_test_123",
  "group_id": "group_123",
  "data": {
    "id_number": "ABCDE1234F"
  }
}

// Format 2: Direct fields
{
  "task_id": "pan_test_123",
  "id_number": "ABCDE1234F"
}

// Format 3: Minimal
{
  "id_number": "ABCDE1234F"
}

// Format 4: Alternative field names
{
  "pan": "ABCDE1234F"
}
```

**All return**: `{"error": "BAD_REQUEST", "message": "Bad Request"}`

## API Endpoints

### 1. Aadhaar OTP Verification

#### Initiate OTP
```http
POST /api/kyc/aadhaar/otp/initiate
Content-Type: application/json
x-api-key: your_internal_api_key

{
  "aadhaarNumber": "123456789012",
  "userId": "user-123",
  "consent": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "referenceId": "task_abc123",
    "message": "OTP sent successfully to registered mobile number",
    "data": {
      "task_id": "task_abc123",
      "status": "initiated",
      "provider": "idfy"
    }
  }
}
```

#### Verify OTP
```http
POST /api/kyc/aadhaar/otp/verify
Content-Type: application/json
x-api-key: your_internal_api_key

{
  "taskId": "task_abc123",
  "otp": "123456",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "message": "Aadhaar verification completed successfully",
    "kycData": {
      "name": "John Doe",
      "dateOfBirth": "1990-01-01",
      "gender": "male",
      "address": {
        "line1": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "country": "India"
      },
      "verificationTimestamp": "2024-01-01T12:00:00.000Z",
      "provider": "idfy"
    }
  }
}
```

### 2. PAN Verification

```http
POST /api/kyc/pan/verify
Content-Type: application/json
x-api-key: your_internal_api_key

{
  "panNumber": "ABCDE1234F",
  "userId": "user-123"
}
```

### 3. Passport Verification

```http
POST /api/kyc/passport/verify
Content-Type: application/json
x-api-key: your_internal_api_key

{
  "passportNumber": "A1234567",
  "dateOfBirth": "1990-01-01",
  "userId": "user-123"
}
```

## Webhook Integration

### Webhook URL Configuration

Configure the following webhook URL in your IDfy dashboard:

**Development:**
```
http://localhost:4001/api/kyc/webhook/idfy
```

**Production:**
```
https://your-domain.com/api/kyc/webhook/idfy
```

### Webhook Payload

IDfy sends webhook notifications when verification tasks complete:

```json
{
  "task_id": "task_abc123",
  "status": "completed",
  "result": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "address": {
      "house": "123",
      "street": "Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  },
  "event_type": "verification_completed",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Webhook Security

Webhooks are secured using HMAC-SHA256 signature verification:

1. IDfy includes `x-webhook-signature` header
2. Signature is verified using `IDFY_WEBHOOK_SECRET`
3. Invalid signatures are rejected with 401 status

## Testing

### Run Integration Tests

```bash
# Install dependencies
npm install

# Run IDfy integration tests
npm run test:idfy
```

### Manual Testing

1. **Test Aadhaar OTP Initiation:**
   ```bash
   curl -X POST http://localhost:4001/api/kyc/aadhaar/otp/initiate \
     -H "Content-Type: application/json" \
     -H "x-api-key: your_internal_api_key" \
     -d '{"aadhaarNumber":"123456789012","userId":"test-user","consent":true}'
   ```

2. **Test PAN Verification:**
   ```bash
   curl -X POST http://localhost:4001/api/kyc/pan/verify \
     -H "Content-Type: application/json" \
     -H "x-api-key: your_internal_api_key" \
     -d '{"panNumber":"ABCDE1234F","userId":"test-user"}'
   ```

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Invalid Aadhaar number format"
}
```

### Error Codes

- `400` - Invalid request format or data
- `401` - Authentication failed
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Internal server error

## Redis Caching

### Cache Keys

- `kyc:aadhaar:{userId}:{taskId}` - Aadhaar verification data
- `kyc:pan:{userId}` - PAN verification data
- `kyc:passport:{userId}` - Passport verification data
- `kyc:user:{userId}:current_aadhaar_task` - Current Aadhaar task reference

### Cache Expiry

- OTP tasks: 5 minutes
- Verification results: 24 hours

## Database Integration

### Supabase Tables

The integration uses the following Supabase tables:

1. **kyc** - Main KYC records
2. **audit_logs** - Audit trail for compliance

### Sample KYC Record

```json
{
  "user_id": "user-123",
  "task_id": "task_abc123",
  "status": "verified",
  "verification_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "provider": "idfy"
  },
  "created_at": "2024-01-01T12:00:00.000Z",
  "updated_at": "2024-01-01T12:05:00.000Z"
}
```

## Security Features

1. **API Key Authentication** - All endpoints require valid API key
2. **Webhook Signature Verification** - HMAC-SHA256 signature validation
3. **Data Masking** - Sensitive data is masked in logs
4. **Rate Limiting** - Prevents abuse with configurable limits
5. **Input Validation** - Joi schema validation for all inputs
6. **Audit Logging** - Complete audit trail for compliance

## Production Deployment

### Prerequisites

1. Valid IDfy API credentials
2. Configured webhook endpoints
3. Redis server for caching
4. Supabase database setup
5. SSL/TLS certificates for HTTPS

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Webhook URL registered with IDfy
- [ ] Redis connection tested
- [ ] Supabase connection tested
- [ ] API endpoints tested
- [ ] Webhook signature verification tested
- [ ] Rate limiting configured
- [ ] Monitoring and alerting setup

## Monitoring

### Health Checks

```http
GET /api/kyc/webhook/health
```

### Metrics to Monitor

- API response times
- Success/failure rates
- Webhook delivery status
- Redis connection health
- Database connection health

## Support

For issues with the IDfy integration:

1. Check the logs for detailed error messages
2. Verify environment configuration
3. Test individual components using the test script
4. Review IDfy API documentation for updates
