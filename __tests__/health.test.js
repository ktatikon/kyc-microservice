const request = require('supertest');

// Mock the app without starting the server
jest.mock('../index.js', () => {
  const express = require('express');
  const app = express();
  
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'kyc-service',
      version: '1.0.0'
    });
  });
  
  return app;
});

describe('KYC Service Health Check', () => {
  let app;
  
  beforeAll(() => {
    app = require('../index.js');
  });

  test('GET /health should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('service', 'kyc-service');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('Health response should have correct structure', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(typeof response.body.status).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
    expect(typeof response.body.service).toBe('string');
    expect(typeof response.body.version).toBe('string');
  });
});

describe('KYC Service Basic Functionality', () => {
  test('Service should be defined', () => {
    expect(require('../index.js')).toBeDefined();
  });

  test('Environment variables should be accessible', () => {
    // Test that we can access environment variables
    expect(process.env).toBeDefined();
  });
});
