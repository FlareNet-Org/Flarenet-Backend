#!/bin/bash
# Pre-commit Test Script for FlareNet Backend
# This script runs essential tests before committing changes

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   FlareNet Backend Pre-commit Tests    ${NC}"
echo -e "${BLUE}========================================${NC}"

# Get changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACMRT | grep -E '\.(js|jsx|ts|tsx)$' || echo "")

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}No relevant files changed. Skipping tests.${NC}"
    exit 0
fi

echo -e "${YELLOW}Changed files:${NC}"
echo "$CHANGED_FILES"

# Determine which tests to run based on changed files
RUN_DB_TESTS=false
RUN_AUTH_TESTS=false
RUN_API_TESTS=false

if echo "$CHANGED_FILES" | grep -q -E '(utils/prismaClient\.js|tests/database\.test\.js|tests/db-management\.test\.js|tests/excloud\.test\.js|prisma/)'; then
    RUN_DB_TESTS=true
fi

if echo "$CHANGED_FILES" | grep -q -E '(auth/|middlewares/)'; then
    RUN_AUTH_TESTS=true
fi

if echo "$CHANGED_FILES" | grep -q -E '(routes/|services/)'; then
    RUN_API_TESTS=true
fi

# Run database tests if needed
if [ "$RUN_DB_TESTS" = true ]; then
    echo -e "\n${YELLOW}Running database tests...${NC}"
    npx jest tests/database.test.js tests/db-management.test.js tests/excloud.test.js --detectOpenHandles
    DB_RESULT=$?
    
    if [ $DB_RESULT -ne 0 ]; then
        echo -e "${RED}✗ Database tests failed. Please fix before committing.${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Database tests passed${NC}"
    fi
fi

# Run auth tests if needed
if [ "$RUN_AUTH_TESTS" = true ]; then
    echo -e "\n${YELLOW}Running auth-related tests...${NC}"
    npx jest tests/.*auth.* --detectOpenHandles
    AUTH_RESULT=$?
    
    if [ $AUTH_RESULT -ne 0 ]; then
        echo -e "${RED}✗ Auth tests failed. Please fix before committing.${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Auth tests passed${NC}"
    fi
fi

# Run API tests if needed
if [ "$RUN_API_TESTS" = true ]; then
    echo -e "\n${YELLOW}Running API-related tests...${NC}"
    npx jest tests/.*routes.* --detectOpenHandles
    API_RESULT=$?
    
    if [ $API_RESULT -ne 0 ]; then
        echo -e "${RED}✗ API tests failed. Please fix before committing.${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ API tests passed${NC}"
    fi
fi

echo -e "\n${GREEN}✓ All tests passed. Proceeding with commit.${NC}"
exit 0
