# =============================================================================
# DEX Mobile v6 - KYC Service Dockerfile
# Multi-stage build for production optimization
# =============================================================================

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    vips-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Validate the application
RUN npm run validate

# =============================================================================
# Production stage
FROM node:18-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    vips \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app .

# Remove unnecessary files
RUN rm -rf test-* __tests__ *.md

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]

# =============================================================================
# Development stage
FROM node:18-alpine AS development

# Set NODE_ENV
ENV NODE_ENV=development

# Set working directory
WORKDIR /app

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    vips-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Create logs and uploads directories
RUN mkdir -p /app/logs /app/uploads

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4001/health || exit 1

# Start the application in development mode
CMD ["npm", "run", "dev"]

# =============================================================================
# Metadata
LABEL maintainer="TechVitta Pvt Ltd <admin@techvitta.com>"
LABEL version="1.0.0"
LABEL description="DEX Mobile v6 - KYC Service"
LABEL org.opencontainers.image.title="DEX KYC Service"
LABEL org.opencontainers.image.description="Government-compliant KYC service for Indian DEX application"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="TechVitta Pvt Ltd"
LABEL org.opencontainers.image.licenses="MIT"
