#!/bin/bash

# Rate Limit Configuration Generator for Flarenet Backend
# This script generates rate limiting configurations for different environments

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
  echo -e "\n${BLUE}======================================${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${BLUE}======================================${NC}\n"
}

# Main execution
echo -e "${BLUE}===========================================${NC}"
echo -e "${YELLOW}Flarenet Backend Rate Limiting Config Generator${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Get environment selection
echo -e "${YELLOW}Select environment to generate configuration for:${NC}"
echo "1) Development"
echo "2) Testing"
echo "3) Staging"
echo "4) Production"
read -p "Enter your choice (1-4): " env_choice

# Set environment-specific parameters
case $env_choice in
  1)
    ENV="development"
    FREE_BUCKET_SIZE=5
    FREE_REFILL_RATE=0.1
    PRO_BUCKET_SIZE=30
    PRO_REFILL_RATE=0.5
    ENTERPRISE_BUCKET_SIZE=60
    ENTERPRISE_REFILL_RATE=1
    FAIL_OPEN=true
    ;;
  2)
    ENV="testing"
    FREE_BUCKET_SIZE=5
    FREE_REFILL_RATE=0.1
    PRO_BUCKET_SIZE=30
    PRO_REFILL_RATE=0.5
    ENTERPRISE_BUCKET_SIZE=60
    ENTERPRISE_REFILL_RATE=1
    FAIL_OPEN=false
    ;;
  3)
    ENV="staging"
    FREE_BUCKET_SIZE=10
    FREE_REFILL_RATE=0.2
    PRO_BUCKET_SIZE=50
    PRO_REFILL_RATE=1
    ENTERPRISE_BUCKET_SIZE=100
    ENTERPRISE_REFILL_RATE=2
    FAIL_OPEN=false
    ;;
  4)
    ENV="production"
    FREE_BUCKET_SIZE=15
    FREE_REFILL_RATE=0.3
    PRO_BUCKET_SIZE=100
    PRO_REFILL_RATE=2
    ENTERPRISE_BUCKET_SIZE=200
    ENTERPRISE_REFILL_RATE=4
    FAIL_OPEN=false
    ;;
  *)
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
    ;;
esac

print_header "Generating configuration for $ENV environment"

# Create config directory if it doesn't exist
mkdir -p config

# Generate JavaScript configuration file
CONFIG_FILE="config/rate-limit-${ENV}.js"

cat > $CONFIG_FILE << EOF
/**
 * Rate Limiting Configuration for ${ENV} Environment
 * Generated on $(date)
 */

const createRateLimiter = require('../middlewares/tokenBucketLimiter');

const ${ENV}RateLimiter = createRateLimiter({
    defaultBucketSize: ${FREE_BUCKET_SIZE},
    defaultRefillRate: ${FREE_REFILL_RATE},
    keyGenerator: (req) => {
        // Use API key if available, otherwise normalize IP
        return req.headers['x-api-key'] || 
               (req.ip.startsWith('::ffff:') ? req.ip.substring(7) : req.ip);
    },
    planLimiter: (req) => {
        // Different limits based on user plan
        const userPlan = req.user?.plan || 'free';
        const limits = {
            free: { 
                bucketSize: ${FREE_BUCKET_SIZE}, 
                refillRate: ${FREE_REFILL_RATE}     // ${FREE_BUCKET_SIZE} requests, refills ${FREE_REFILL_RATE} per sec
            },
            pro: { 
                bucketSize: ${PRO_BUCKET_SIZE}, 
                refillRate: ${PRO_REFILL_RATE}      // ${PRO_BUCKET_SIZE} requests, refills ${PRO_REFILL_RATE} per sec
            },
            enterprise: { 
                bucketSize: ${ENTERPRISE_BUCKET_SIZE}, 
                refillRate: ${ENTERPRISE_REFILL_RATE} // ${ENTERPRISE_BUCKET_SIZE} requests, refills ${ENTERPRISE_REFILL_RATE} per sec
            }
        };
        return limits[userPlan] || limits.free;
    },
    failOpen: ${FAIL_OPEN} // ${FAIL_OPEN ? "Allow" : "Don't allow"} requests if Redis is down
});

module.exports = ${ENV}RateLimiter;
EOF

echo -e "${GREEN}Configuration file generated at ${CONFIG_FILE}${NC}"

# Generate environment-specific .env additions
ENV_FILE="config/rate-limit-${ENV}.env"

cat > $ENV_FILE << EOF
# Rate Limiting Environment Variables for ${ENV}
# Generated on $(date)

# Redis Configuration
REDIS_HOST=redis://${ENV}-redis:6379
REDIS_KEY_PREFIX=ratelimit:${ENV}:
REDIS_KEY_EXPIRY=86400

# Rate Limiting Defaults
DEFAULT_BUCKET_SIZE=${FREE_BUCKET_SIZE}
DEFAULT_REFILL_RATE=${FREE_REFILL_RATE}

# Plan-specific settings
FREE_BUCKET_SIZE=${FREE_BUCKET_SIZE}
FREE_REFILL_RATE=${FREE_REFILL_RATE}
PRO_BUCKET_SIZE=${PRO_BUCKET_SIZE}
PRO_REFILL_RATE=${PRO_REFILL_RATE}
ENTERPRISE_BUCKET_SIZE=${ENTERPRISE_BUCKET_SIZE}
ENTERPRISE_REFILL_RATE=${ENTERPRISE_REFILL_RATE}

# Security settings
RATE_LIMIT_FAIL_OPEN=${FAIL_OPEN}
EOF

echo -e "${GREEN}Environment variables file generated at ${ENV_FILE}${NC}"

# Generate Docker Compose override for this environment
DOCKER_FILE="config/docker-compose.${ENV}.yml"

cat > $DOCKER_FILE << EOF
# Docker Compose Override for ${ENV} Environment Rate Limiting
# Generated on $(date)

version: '3'

services:
  api:
    environment:
      - REDIS_HOST=redis://${ENV}-redis:6379
      - REDIS_KEY_PREFIX=ratelimit:${ENV}:
      - REDIS_KEY_EXPIRY=86400
      - DEFAULT_BUCKET_SIZE=${FREE_BUCKET_SIZE}
      - DEFAULT_REFILL_RATE=${FREE_REFILL_RATE}
      - FREE_BUCKET_SIZE=${FREE_BUCKET_SIZE}
      - FREE_REFILL_RATE=${FREE_REFILL_RATE}
      - PRO_BUCKET_SIZE=${PRO_BUCKET_SIZE}
      - PRO_REFILL_RATE=${PRO_REFILL_RATE}
      - ENTERPRISE_BUCKET_SIZE=${ENTERPRISE_BUCKET_SIZE}
      - ENTERPRISE_REFILL_RATE=${ENTERPRISE_REFILL_RATE}
      - RATE_LIMIT_FAIL_OPEN=${FAIL_OPEN}
    
  ${ENV}-redis:
    image: redis:alpine
    volumes:
      - ${ENV}-redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  ${ENV}-redis-data:
EOF

echo -e "${GREEN}Docker Compose override file generated at ${DOCKER_FILE}${NC}"

# Generate NGINX rate limiting configuration (additional protection layer)
NGINX_FILE="config/nginx-rate-limit-${ENV}.conf"

cat > $NGINX_FILE << EOF
# NGINX Rate Limiting Configuration for ${ENV} Environment
# Generated on $(date)

# Define rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_${ENV}:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=auth_${ENV}:10m rate=5r/s;

server {
    listen 80;
    server_name api.example.com;

    # Global rate limiting
    limit_req zone=api_${ENV} burst=20 nodelay;
    
    # Authentication endpoints - stricter limits
    location /auth/ {
        limit_req zone=auth_${ENV} burst=5 nodelay;
        proxy_pass http://backend;
    }
    
    # API endpoints with plan-based limiting
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    
    # Return 429 Too Many Requests on rate limiting
    error_page 503 = 429 /rate_limit.html;
    
    location = /rate_limit.html {
        internal;
        return 429 '{"error":"Too Many Requests","retryAfter":60}';
        add_header Content-Type application/json;
    }
}
EOF

echo -e "${GREEN}NGINX configuration file generated at ${NGINX_FILE}${NC}"

echo -e "\n${BLUE}===========================================${NC}"
echo -e "${GREEN}Rate Limiting Configuration Generation Complete${NC}"
echo -e "${YELLOW}Generated configurations for ${ENV} environment${NC}"
echo -e "${BLUE}===========================================${NC}" 