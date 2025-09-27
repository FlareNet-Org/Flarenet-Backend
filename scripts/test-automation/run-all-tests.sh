#!/bin/bash
# Master Test Script for FlareNet Backend
# This script runs all tests and provides a summary of results

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   FlareNet Backend Test Automation     ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Starting test run on: $(date)${NC}\n"

# Create log directory if it doesn't exist
mkdir -p ./logs/tests

# Log file with timestamp
LOG_FILE="./logs/tests/test-run-$(date +%Y%m%d-%H%M%S).log"
touch $LOG_FILE

# Run environment validation
echo -e "${YELLOW}Validating environment...${NC}"
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "Node.js: ${NODE_VERSION}"
echo -e "NPM: ${NPM_VERSION}"

# Check if .env file exists
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
else
    echo -e "${RED}✗ .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠ Created .env from .env.example. Please update with your settings!${NC}"
    else
        echo -e "${RED}✗ .env.example not found. Please create a .env file manually.${NC}"
        exit 1
    fi
fi

# Run database validation
echo -e "\n${YELLOW}Checking database connection...${NC}"
npx prisma validate >> $LOG_FILE 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema validated successfully${NC}"
else
    echo -e "${RED}✗ Database schema validation failed${NC}"
    echo -e "${YELLOW}See $LOG_FILE for details${NC}"
fi

# Run all Jest tests
echo -e "\n${YELLOW}Running all tests...${NC}"
npm test | tee -a $LOG_FILE

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
echo -e "${YELLOW}Test Summary:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed: $TOTAL_TESTS tests${NC}"
else
    echo -e "${RED}✗ Some tests failed: $FAILED_TESTS failed out of $TOTAL_TESTS tests${NC}"
    echo -e "${YELLOW}See $LOG_FILE for details${NC}"
fi
echo -e "${BLUE}========================================${NC}"

# Return the test result as exit code
exit $TEST_RESULT
