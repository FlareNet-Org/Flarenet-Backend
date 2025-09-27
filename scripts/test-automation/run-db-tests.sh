#!/bin/bash
# Database Test Script for FlareNet Backend
# This script runs only database-related tests

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   FlareNet Backend Database Tests      ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Starting database tests on: $(date)${NC}\n"

# Create log directory if it doesn't exist
mkdir -p ./logs/tests

# Log file with timestamp
LOG_FILE="./logs/tests/db-test-$(date +%Y%m%d-%H%M%S).log"
touch $LOG_FILE

# Run database validation
echo -e "\n${YELLOW}Checking database connection...${NC}"
npx prisma validate >> $LOG_FILE 2>&1
PRISMA_RESULT=$?

if [ $PRISMA_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema validated successfully${NC}"
else
    echo -e "${RED}✗ Database schema validation failed${NC}"
    echo -e "${YELLOW}See $LOG_FILE for details${NC}"
    echo -e "${YELLOW}Attempting to continue with tests...${NC}"
fi

# Check the database connection details
echo -e "\n${YELLOW}Checking database connection...${NC}"

# Extract connection details safely without exposing password in code
getDbConfig() {
  try_url=$(grep DATABASE_URL .env | cut -d '=' -f2- || echo "")
  if [ -z "$try_url" ]; then
    echo ""
    return
  fi

  # Extract the host from the URL
  host=$(echo "$try_url" | grep -oP '(?<=@)[^:]+(?=:)' || echo "")
  echo "$host"
}

DB_HOST=$(getDbConfig)

if [ -z "$DB_HOST" ]; then
    echo -e "${RED}✗ Could not determine database host from .env file${NC}"
else
    echo -e "${YELLOW}Database host: $DB_HOST${NC}"
    
    # Check if it's ExCloud
    if [[ "$DB_HOST" == *"excloud"* ]]; then
        echo -e "${GREEN}✓ Using ExCloud database instance${NC}"
        IS_EXCLOUD=true
    else
        echo -e "${YELLOW}⚠ Not using ExCloud - using $DB_HOST${NC}"
        IS_EXCLOUD=false
        
        # Check if Docker is involved
        if command -v docker &> /dev/null; then
            CONTAINER_RUNNING=$(docker ps --filter "name=flarenetbackend-postgres" --format "{{.Names}}" | grep postgres || echo "")
            
            if [ -n "$CONTAINER_RUNNING" ]; then
                echo -e "${GREEN}✓ PostgreSQL container is running: $CONTAINER_RUNNING${NC}"
            fi
        fi
    fi
fi

# Test connectivity using prisma directly
echo -e "${YELLOW}Testing database connectivity with Prisma...${NC}"
npx prisma db execute --schema=./prisma/schema.prisma --stdin <<EOF
SELECT 1 as test;
EOF

DB_RESULT=$?
if [ $DB_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}Continuing with tests anyway...${NC}"
fi

# Run database tests
echo -e "\n${YELLOW}Running database tests...${NC}"
npx jest tests/database.test.js tests/db-management.test.js tests/excloud.test.js --detectOpenHandles | tee -a $LOG_FILE

TEST_RESULT=$?

# Parse test results from log file
TOTAL_TESTS=$(grep -o "[0-9]* passed" $LOG_FILE | awk '{print $1}')
FAILED_TESTS=$(grep -o "[0-9]* failed" $LOG_FILE | awk '{print $1}' || echo "0")

# If FAILED_TESTS is empty, set it to 0
if [ -z "$FAILED_TESTS" ]; then
    FAILED_TESTS=0
fi

# Print summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}Database Test Summary:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All database tests passed: $TOTAL_TESTS tests${NC}"
else
    echo -e "${RED}✗ Some database tests failed: $FAILED_TESTS failed out of $TOTAL_TESTS tests${NC}"
    echo -e "${YELLOW}See $LOG_FILE for details${NC}"
fi
echo -e "${BLUE}========================================${NC}"

# Return the test result as exit code
exit $TEST_RESULT
