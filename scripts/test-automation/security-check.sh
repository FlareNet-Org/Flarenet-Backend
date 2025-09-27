#!/bin/bash
# Security Check Script for FlareNet Backend
# This script runs security audits and checks for vulnerabilities

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   FlareNet Backend Security Checks     ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Starting security checks on: $(date)${NC}\n"

# Create log directory if it doesn't exist
mkdir -p ./logs/security

# Log file with timestamp
LOG_FILE="./logs/security/security-check-$(date +%Y%m%d-%H%M%S).log"
touch $LOG_FILE

# Check for environment file security
echo -e "\n${YELLOW}Checking environment files...${NC}"
if [ -f .env ]; then
    echo -e "${YELLOW}Checking .env file permissions...${NC}"
    ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%Lp" .env 2>/dev/null)
    
    if [[ "$ENV_PERMS" == "600" ]] || [[ "$ENV_PERMS" == "400" ]]; then
        echo -e "${GREEN}✓ .env file has secure permissions: $ENV_PERMS${NC}"
    else
        echo -e "${RED}✗ .env file has insecure permissions: $ENV_PERMS${NC}"
        echo -e "${YELLOW}⚠ Consider running: chmod 600 .env${NC}"
    fi
    
    # Check for sensitive credentials in .env
    echo -e "\n${YELLOW}Checking for hardcoded credentials in .env...${NC}"
    if grep -q -E "(password|PASSWORD|passwd|PASSWD).*=.*(password|123456|admin|root)" .env; then
        echo -e "${RED}✗ Possible default or weak credentials found in .env${NC}"
        echo -e "${YELLOW}⚠ Please review your .env file for security${NC}"
    else
        echo -e "${GREEN}✓ No obvious hardcoded credentials detected${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No .env file found${NC}"
fi

# Run npm audit
echo -e "\n${YELLOW}Running npm security audit...${NC}"
npm audit --json > ./logs/security/npm-audit.json 2>&1
AUDIT_RESULT=$?

# Parse and display the audit results
VULNERABILITIES=$(cat ./logs/security/npm-audit.json | grep -o '"vulnerabilities":{"total":[0-9]*' | grep -o '[0-9]*$' || echo "N/A")
HIGH_VULNS=$(cat ./logs/security/npm-audit.json | grep -o '"high":[0-9]*' | grep -o '[0-9]*$' || echo "0")
CRITICAL_VULNS=$(cat ./logs/security/npm-audit.json | grep -o '"critical":[0-9]*' | grep -o '[0-9]*$' || echo "0")

echo -e "Total vulnerabilities found: ${YELLOW}$VULNERABILITIES${NC}"
echo -e "High severity: ${YELLOW}$HIGH_VULNS${NC}"
echo -e "Critical severity: ${RED}$CRITICAL_VULNS${NC}"

if [ "$HIGH_VULNS" -gt 0 ] || [ "$CRITICAL_VULNS" -gt 0 ]; then
    echo -e "${RED}✗ Critical or high severity vulnerabilities detected${NC}"
    echo -e "${YELLOW}⚠ Run 'npm audit fix' to attempt automatic fixes${NC}"
else
    echo -e "${GREEN}✓ No high or critical severity vulnerabilities detected${NC}"
fi

# Check for secure database connection (using SSL/TLS)
echo -e "\n${YELLOW}Checking for secure database connection...${NC}"
if grep -q "sslmode=require" .env || grep -q "sslmode=verify-ca" .env || grep -q "sslmode=verify-full" .env; then
    echo -e "${GREEN}✓ Database connection appears to use SSL/TLS${NC}"
else
    echo -e "${YELLOW}⚠ Database connection may not be using SSL/TLS${NC}"
    echo -e "${YELLOW}  Consider adding sslmode=require to your connection string${NC}"
fi

# Check for hardcoded secrets in code
echo -e "\n${YELLOW}Checking for hardcoded secrets in code...${NC}"
SECRET_FILES=$(grep -r -l -E "(password|secret|key|token|pass).*=.*(\"|\').{8,}" --include="*.js" --exclude-dir="node_modules" . || echo "")

if [ -n "$SECRET_FILES" ]; then
    echo -e "${RED}✗ Potential hardcoded secrets found in:${NC}"
    echo "$SECRET_FILES" | tee -a $LOG_FILE
    echo -e "${YELLOW}⚠ Please review these files and move any secrets to environment variables${NC}"
else
    echo -e "${GREEN}✓ No obvious hardcoded secrets found in code${NC}"
fi

# Check for secure cookies
echo -e "\n${YELLOW}Checking for secure cookie settings...${NC}"
if grep -r -E "cookie.*secure.*true" --include="*.js" . >/dev/null 2>&1 && 
   grep -r -E "cookie.*httpOnly.*true" --include="*.js" . >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Secure and HttpOnly cookie settings found${NC}"
else
    echo -e "${YELLOW}⚠ Could not confirm secure cookie settings${NC}"
    echo -e "${YELLOW}  Ensure cookies use secure:true and httpOnly:true options${NC}"
fi

# Print summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}Security Check Summary:${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

if [ "$HIGH_VULNS" -eq 0 ] && [ "$CRITICAL_VULNS" -eq 0 ] && [ -z "$SECRET_FILES" ]; then
    echo -e "${GREEN}✓ All security checks passed${NC}"
else
    echo -e "${RED}✗ Some security checks failed${NC}"
    echo -e "${YELLOW}See $LOG_FILE for details${NC}"
fi

echo -e "${BLUE}========================================${NC}"

# Exit with appropriate code
if [ "$HIGH_VULNS" -gt 0 ] || [ "$CRITICAL_VULNS" -gt 0 ] || [ -n "$SECRET_FILES" ]; then
    exit 1
else
    exit 0
fi
