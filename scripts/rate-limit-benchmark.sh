#!/bin/bash

# Rate Limit Benchmark Script for Flarenet Backend
# This script tests rate limiting performance under load

# Configuration
API_URL="http://localhost:5000/api/llm/chat"
CONCURRENT_USERS=5
REQUESTS_PER_USER=20
TOTAL_REQUESTS=$((CONCURRENT_USERS * REQUESTS_PER_USER))

# API keys for different plans
FREE_API_KEY="free-plan-api-key"
PRO_API_KEY="pro-plan-api-key" 
ENTERPRISE_API_KEY="enterprise-plan-api-key"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run benchmark for a specific plan
benchmark_plan() {
  local plan=$1
  local api_key=$2
  local expected_rate=$3
  
  echo -e "\n${BLUE}======================================${NC}"
  echo -e "${BLUE}Benchmarking ${YELLOW}$plan${BLUE} plan rate limiting${NC}"
  echo -e "${BLUE}Concurrent users: ${YELLOW}$CONCURRENT_USERS${NC}"
  echo -e "${BLUE}Requests per user: ${YELLOW}$REQUESTS_PER_USER${NC}"
  echo -e "${BLUE}Total requests: ${YELLOW}$TOTAL_REQUESTS${NC}"
  echo -e "${BLUE}Expected rate: ${YELLOW}$expected_rate${NC}"
  echo -e "${BLUE}======================================${NC}\n"
  
  # Create temporary files to store results
  local temp_file=$(mktemp)
  local results_file=$(mktemp)
  
  echo "Starting benchmark..."
  
  # Use Apache Bench if available, otherwise fall back to parallel curl requests
  if command -v ab &> /dev/null; then
    echo "Using Apache Bench for load testing"
    
    # Create a temporary JSON file for the POST data
    local json_file=$(mktemp)
    echo '{"message":"hello", "userId":1}' > $json_file
    
    # Run Apache Bench
    ab -n $TOTAL_REQUESTS -c $CONCURRENT_USERS \
       -H "Content-Type: application/json" \
       -H "X-API-Key: $api_key" \
       -p $json_file \
       -T "application/json" \
       $API_URL > $temp_file
    
    # Clean up
    rm $json_file
    
    # Extract results
    requests_per_second=$(grep "Requests per second" $temp_file | awk '{print $4}')
    mean_time=$(grep "Time per request" $temp_file | head -1 | awk '{print $4}')
    success_requests=$(grep "Complete requests" $temp_file | awk '{print $3}')
    failed_requests=$(grep "Failed requests" $temp_file | awk '{print $3}')
    
    echo -e "\n${BLUE}Benchmark Results for $plan plan:${NC}"
    echo -e "${YELLOW}Requests per second: $requests_per_second${NC}"
    echo -e "${YELLOW}Mean time per request: $mean_time ms${NC}"
    echo -e "${GREEN}Successful requests: $success_requests${NC}"
    echo -e "${RED}Failed requests: $failed_requests${NC}"
    
  else
    echo "Apache Bench not found, using parallel curl requests"
    
    # Function to make a single request
    make_request() {
      local user_id=$1
      local req_id=$2
      
      response=$(curl -s -w "%{http_code},%{time_total}" -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $api_key" \
        -d '{"message":"hello", "userId":'"$user_id"'}' \
        $API_URL)
      
      # Extract status code and response time
      IFS=',' read -r body status_code time_total <<< "${response##*,}"
      
      # Record results
      echo "$user_id,$req_id,$status_code,$time_total" >> $results_file
    }
    
    # Start timer
    start_time=$(date +%s.%N)
    
    # Launch parallel requests
    for user in $(seq 1 $CONCURRENT_USERS); do
      for req in $(seq 1 $REQUESTS_PER_USER); do
        make_request $user $req &
      done
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
    avg_time=$(awk -F',' '{sum+=$4} END {print sum/NR}' $results_file)
    requests_per_second=$(echo "scale=2; $total_requests / $total_time" | bc)
    
    echo -e "\n${BLUE}Benchmark Results for $plan plan:${NC}"
    echo -e "${YELLOW}Total time: $total_time seconds${NC}"
    echo -e "${YELLOW}Requests per second: $requests_per_second${NC}"
    echo -e "${YELLOW}Average response time: $avg_time seconds${NC}"
    echo -e "${GREEN}Successful requests: $success_requests${NC}"
    echo -e "${RED}Rate limited requests: $rate_limited_requests${NC}"
    echo -e "${RED}Other errors: $other_errors${NC}"
  fi
  
  echo -e "${BLUE}======================================${NC}\n"
  
  # Clean up
  rm $temp_file $results_file
  
  # Wait between benchmarks
  echo "Waiting 10 seconds before next benchmark..."
  sleep 10
}

# Main execution
echo -e "${BLUE}===========================================${NC}"
echo -e "${YELLOW}Flarenet Backend Rate Limiting Benchmark${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Run benchmarks for each plan
benchmark_plan "free" "$FREE_API_KEY" "0.1 req/sec"
benchmark_plan "pro" "$PRO_API_KEY" "0.5 req/sec"
benchmark_plan "enterprise" "$ENTERPRISE_API_KEY" "1 req/sec"

echo -e "\n${BLUE}===========================================${NC}"
echo -e "${GREEN}Rate Limiting Benchmark Completed${NC}"
echo -e "${BLUE}===========================================${NC}" 