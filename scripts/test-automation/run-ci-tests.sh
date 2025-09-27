#!/bin/bash
# CI Test Script for FlareNet Backend
# This script runs comprehensive tests for CI environments

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   FlareNet Backend CI Tests            ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Starting CI tests on: $(date)${NC}\n"

# Create log directory if it doesn't exist
mkdir -p ./logs/tests

# Log file with timestamp
LOG_FILE="./logs/tests/ci-test-$(date +%Y%m%d-%H%M%S).log"
touch $LOG_FILE

# Environment setup
echo -e "${YELLOW}Setting up CI environment...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file for CI...${NC}"
    cp .env.example .env
    # You might want to customize the .env file for CI here
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
fi

# Run prisma schema validation
echo -e "\n${YELLOW}Validating database schema...${NC}"
npx prisma validate

# Run database migration check (not applying migrations)
echo -e "\n${YELLOW}Checking for pending migrations...${NC}"
npx prisma migrate status

# Run all tests with coverage
echo -e "\n${YELLOW}Running all tests with coverage...${NC}"
npm test -- --coverage | tee -a $LOG_FILE

TEST_RESULT=$?

# Run linting
echo -e "\n${YELLOW}Running linting checks...${NC}"
if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    npm run lint | tee -a $LOG_FILE
    LINT_RESULT=$?
else
    echo -e "${YELLOW}⚠ No lint script found in package.json${NC}"
    LINT_RESULT=0
fi

# Parse test results from log file
TOTAL_TESTS=$(grep -o "[0-9]* passed" $LOG_FILE | awk '{print $1}')
FAILED_TESTS=$(grep -o "[0-9]* failed" $LOG_FILE | awk '{print $1}' || echo "0")

# If FAILED_TESTS is empty, set it to 0
if [ -z "$FAILED_TESTS" ]; then
    FAILED_TESTS=0
fi

# Print summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}CI Test Summary:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed: $TOTAL_TESTS tests${NC}"
else
    echo -e "${RED}✗ Some tests failed: $FAILED_TESTS failed out of $TOTAL_TESTS tests${NC}"
fi

if [ $LINT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Linting checks passed${NC}"
else
    echo -e "${RED}✗ Linting checks failed${NC}"
fi

echo -e "${BLUE}========================================${NC}"

# Final exit code (fail if either tests or linting failed)
if [ $TEST_RESULT -ne 0 ] || [ $LINT_RESULT -ne 0 ]; then
    echo -e "${RED}✗ CI checks failed${NC}"
    echo -e "${YELLOW}See $LOG_FILE for details${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All CI checks passed${NC}"
    exit 0
fi
