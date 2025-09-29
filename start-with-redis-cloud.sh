#!/bin/bash

echo "Starting Flarenet Backend with Redis Cloud configuration..."
echo "Loading Redis Cloud configuration from .env.redis-cloud"

# Set flag to use Redis Cloud configuration
export REDIS_CLOUD=true

# Note: Actual credentials should be loaded from .env.redis-cloud file
# This script only sets the flag to use that file

# Connection settings - these don't expose credentials
export REDIS_RETRY_STRATEGY=true
export REDIS_MAX_RETRIES=10
export REDIS_CONNECT_TIMEOUT=30000
export REDIS_KEEP_ALIVE=true
export REDIS_ENABLED=true

# Start the application with explicit Redis Cloud config
node -r dotenv/config index.js dotenv_config_path=.env.redis-cloud