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

# Check if Docker is running and database container is available
echo -e "\n${YELLOW}Checking Docker database container...${NC}"
if command -v docker &> /dev/null; then
    CONTAINER_RUNNING=$(docker ps --filter "name=flarenetbackend-postgres" --format "{{.Names}}" | grep postgres || echo "")
    
    if [ -n "$CONTAINER_RUNNING" ]; then
        echo -e "${GREEN}✓ PostgreSQL container is running: $CONTAINER_RUNNING${NC}"
        
        # Run a simple check query
        echo -e "${YELLOW}Testing database connectivity...${NC}"
        DB_TEST=$(docker exec -it $CONTAINER_RUNNING bash -c "psql -U postgres -d flarenet -c 'SELECT 1 as test;'" 2>&1)
        
        if [[ $DB_TEST == *"test"* ]]; then
            echo -e "${GREEN}✓ Database connection successful${NC}"
        else
            echo -e "${RED}✗ Database connection failed${NC}"
            echo -e "$DB_TEST" >> $LOG_FILE
        fi
    else
        echo -e "${RED}✗ PostgreSQL container is not running${NC}"
        echo -e "${YELLOW}Attempting to run tests anyway...${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker not found. Skipping container check.${NC}"
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
