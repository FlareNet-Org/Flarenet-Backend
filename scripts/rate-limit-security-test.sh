#!/bin/bash

# Rate Limit Security Test Script for Flarenet Backend
# This script tests various security aspects of the rate limiting implementation

# Configuration
API_URL="http://localhost:3000/chat"
ATTACK_ITERATIONS=50
DELAY_BETWEEN_TESTS=5

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
  echo -e "\n${BLUE}======================================${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${BLUE}======================================${NC}\n"
}

# Function to check if a response contains specific text
contains_text() {
  echo "$1" | grep -q "$2"
  return $?
}

# Main execution
echo -e "${BLUE}===========================================${NC}"
echo -e "${YELLOW}Flarenet Backend Rate Limiting Security Test${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Test 1: API Key Forgery Attempt
print_header "Test 1: API Key Forgery Attempt"
echo "Attempting to use forged/invalid API keys to bypass rate limiting..."

# Array of potentially malicious API keys to test
declare -a malicious_keys=(
  "' OR 1=1 --"
  "<script>alert(1)</script>"
  "pro-plan-api-key' OR '1'='1"
  "UNION SELECT * FROM users"
  "enterprise-plan-api-key-forged"
  "null"
  "undefined"
  "true"
  "{\"plan\":\"enterprise\"}"
)

for key in "${malicious_keys[@]}"; do
  echo -e "${PURPLE}Testing key: ${key}${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $key" \
    -d '{"message":"hello", "userId":1}' \
    $API_URL)
  
  # Extract status code (last line)
  http_code=$(echo "$response" | tail -n1)
  # Extract body (all but last line)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "200" ]; then
    echo -e "${RED}SECURITY ISSUE: Request succeeded with forged API key!${NC}"
    echo -e "${RED}Response: $body${NC}"
  else
    echo -e "${GREEN}Security test passed: Request rejected with status $http_code${NC}"
  fi
  
  # Small delay between requests
  sleep 0.5
done

# Test 2: IP Spoofing Attempt
print_header "Test 2: IP Spoofing Attempt"
echo "Attempting to spoof IP addresses to bypass rate limiting..."

# Array of headers to try for IP spoofing
declare -a ip_headers=(
  "X-Forwarded-For: 192.168.1.1"
  "X-Forwarded-For: 127.0.0.1"
  "X-Real-IP: 10.0.0.1"
  "X-Originating-IP: [203.0.113.1]"
  "Client-IP: 198.51.100.1"
  "X-Client-IP: 192.0.2.1"
  "Forwarded: for=198.18.0.1"
  "True-Client-IP: 192.168.0.1"
)

for header in "${ip_headers[@]}"; do
  echo -e "${PURPLE}Testing header: ${header}${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "$header" \
    -d '{"message":"hello", "userId":1}' \
    $API_URL)
  
  # Extract status code and body
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  # Check if we got a 200 response
  if [ "$http_code" == "200" ]; then
    # Make several rapid requests to see if we can bypass rate limiting
    echo "Testing rapid requests with this header..."
    
    limited=false
    for i in {1..10}; do
      rapid_response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "$header" \
        -d '{"message":"hello", "userId":1}' \
        $API_URL)
      
      rapid_code=$(echo "$rapid_response" | tail -n1)
      
      if [ "$rapid_code" == "429" ]; then
        limited=true
        break
      fi
      
      # No delay to test rate limiting
    done
    
    if [ "$limited" = true ]; then
      echo -e "${GREEN}Security test passed: Rate limiting still applied despite IP spoofing attempt${NC}"
    else
      echo -e "${RED}SECURITY ISSUE: Possible IP spoofing vulnerability with header: $header${NC}"
    fi
  else
    echo -e "${GREEN}Header rejected with status $http_code${NC}"
  fi
  
  # Small delay between tests
  sleep 1
done

# Test 3: Distributed Attack Simulation
print_header "Test 3: Distributed Attack Simulation"
echo "Simulating a distributed attack from multiple sources..."

# Create a temporary file to store results
results_file=$(mktemp)

# Function to make a request with a random API key and IP
make_distributed_request() {
  local req_id=$1
  local random_ip="192.168.$(( RANDOM % 256 )).$(( RANDOM % 256 ))"
  local api_key="test-key-$req_id"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $api_key" \
    -H "X-Forwarded-For: $random_ip" \
    -d '{"message":"hello", "userId":1}' \
    $API_URL)
  
  # Extract status code and body
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  # Record results
  echo "$req_id,$http_code,$random_ip,$api_key" >> $results_file
}

# Start timer
start_time=$(date +%s.%N)

# Launch parallel requests
for i in $(seq 1 $ATTACK_ITERATIONS); do
  make_distributed_request $i &
  
  # Add small random delay to simulate distributed nature
  sleep 0.$(( RANDOM % 5 ))
done

# Wait for all background processes to complete
wait

# End timer
end_time=$(date +%s.%N)
total_time=$(echo "$end_time - $start_time" | bc)

# Process results
total_requests=$(wc -l < $results_file)
success_requests=$(grep -c ",200," $results_file)
rate_limited_requests=$(grep -c ",429," $results_file)
other_errors=$((total_requests - success_requests - rate_limited_requests))

echo -e "\n${BLUE}Distributed Attack Simulation Results:${NC}"
echo -e "${YELLOW}Total time: $total_time seconds${NC}"
echo -e "${GREEN}Successful requests: $success_requests${NC}"
echo -e "${RED}Rate limited requests: $rate_limited_requests${NC}"
echo -e "${RED}Other errors: $other_errors${NC}"

# Analyze effectiveness
rate_limited_percentage=$((rate_limited_requests * 100 / total_requests))
if [ $rate_limited_percentage -lt 50 ]; then
  echo -e "${RED}SECURITY CONCERN: Less than 50% of distributed requests were rate limited!${NC}"
  echo -e "${RED}Your system may be vulnerable to distributed attacks.${NC}"
else
  echo -e "${GREEN}Security test passed: $rate_limited_percentage% of distributed requests were rate limited${NC}"
fi

# Clean up
rm $results_file

# Test 4: Payload Size Attack
print_header "Test 4: Payload Size Attack"
echo "Testing resistance to large payload attacks..."

# Create payloads of increasing size
for size in 1 10 100 1000 10000 100000; do
  # Generate a JSON payload of approximately the target size
  payload="{\"message\":\""
  payload+=$(printf '%*s' $size | tr ' ' 'X')
  payload+="\", \"userId\":1}"
  
  echo -e "${PURPLE}Testing payload of approximately $size bytes${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$payload" \
    $API_URL)
  
  # Extract status code and body
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "413" ]; then
    echo -e "${GREEN}Security test passed: Large payload correctly rejected with 413 Payload Too Large${NC}"
  elif [ "$http_code" == "400" ]; then
    echo -e "${GREEN}Security test passed: Large payload rejected with 400 Bad Request${NC}"
  elif [ "$http_code" == "200" ]; then
    echo -e "${YELLOW}WARNING: Server accepted a $size byte payload${NC}"
  else
    echo -e "${YELLOW}Server responded with status $http_code${NC}"
    echo -e "${YELLOW}Response: $body${NC}"
  fi
  
  # Delay between tests
  sleep 1
done

# Test 5: Authentication Brute Force Protection
print_header "Test 5: Authentication Brute Force Protection"
echo "Testing protection against authentication brute force attacks..."

# Assuming there's an authentication endpoint
AUTH_URL="http://localhost:3000/auth/login"

# Try multiple rapid login attempts
success_count=0
rate_limited_count=0

for i in $(seq 1 20); do
  echo -e "${PURPLE}Login attempt $i${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"admin", "password":"wrong'$i'"}' \
    $AUTH_URL)
  
  # Extract status code and body
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "429" ]; then
    echo -e "${GREEN}Rate limiting applied after $i attempts${NC}"
    rate_limited_count=$((rate_limited_count+1))
  elif [ "$http_code" == "200" ]; then
    echo -e "${RED}SECURITY ISSUE: Login succeeded with incorrect credentials!${NC}"
    success_count=$((success_count+1))
  elif [ "$http_code" == "401" ] || [ "$http_code" == "403" ]; then
    echo -e "${YELLOW}Authentication failed as expected${NC}"
  else
    echo -e "${YELLOW}Server responded with status $http_code${NC}"
  fi
  
  # No delay to test rate limiting
done

if [ $rate_limited_count -eq 0 ]; then
  echo -e "${RED}SECURITY ISSUE: No rate limiting applied to authentication attempts!${NC}"
elif [ $success_count -gt 0 ]; then
  echo -e "${RED}SECURITY ISSUE: $success_count successful logins with incorrect credentials!${NC}"
else
  echo -e "${GREEN}Security test passed: Authentication protected against brute force${NC}"
fi

echo -e "\n${BLUE}===========================================${NC}"
echo -e "${GREEN}Rate Limiting Security Test Completed${NC}"
echo -e "${BLUE}===========================================${NC}"