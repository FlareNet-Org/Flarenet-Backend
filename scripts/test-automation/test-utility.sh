#!/bin/bash
# FlareNet Backend Test Automation Utility
# This script provides a menu to run various testing scripts

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display the menu
display_menu() {
    clear
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   FlareNet Backend Test Automation    ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "${YELLOW}Choose an option:${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"
    echo -e "1. ${GREEN}Run all tests${NC}"
    echo -e "2. ${GREEN}Run database tests${NC}"
    echo -e "3. ${GREEN}Run CI tests${NC}"
    echo -e "4. ${GREEN}Run security checks${NC}"
    echo -e "5. ${GREEN}Install git hooks${NC}"
    echo -e "6. ${YELLOW}Validate environment${NC}"
    echo -e "7. ${YELLOW}Check database connection${NC}"
    echo -e "8. ${RED}Exit${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -n "Enter your choice [1-8]: "
}

# Function to validate environment
validate_environment() {
    echo -e "\n${YELLOW}Validating environment...${NC}"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
    else
        echo -e "${RED}✗ Node.js not found${NC}"
        return 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
    else
        echo -e "${RED}✗ npm not found${NC}"
        return 1
    fi
    
    # Check for .env file
    if [ -f .env ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
    else
        echo -e "${YELLOW}⚠ .env file not found${NC}"
        
        if [ -f .env.example ]; then
            read -p "Would you like to create a .env file from .env.example? (y/n): " CREATE_ENV
            if [[ $CREATE_ENV == "y" || $CREATE_ENV == "Y" ]]; then
                cp .env.example .env
                echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
                echo -e "${YELLOW}⚠ Please update the .env file with your settings${NC}"
            fi
        else
            echo -e "${RED}✗ .env.example not found${NC}"
        fi
    fi
    
    # Check for node_modules
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✓ node_modules directory exists${NC}"
    else
        echo -e "${YELLOW}⚠ node_modules directory not found${NC}"
        read -p "Would you like to install dependencies? (y/n): " INSTALL_DEPS
        if [[ $INSTALL_DEPS == "y" || $INSTALL_DEPS == "Y" ]]; then
            npm install
            echo -e "${GREEN}✓ Dependencies installed${NC}"
        fi
    fi
    
    # Check for prisma
    if [ -d "prisma" ]; then
        echo -e "${GREEN}✓ Prisma directory exists${NC}"
        
        # Check for migrations
        if [ -d "prisma/migrations" ]; then
            MIGRATION_COUNT=$(ls -1 prisma/migrations | wc -l)
            echo -e "${GREEN}✓ Migrations directory exists with $MIGRATION_COUNT entries${NC}"
        else
            echo -e "${YELLOW}⚠ No migrations directory found${NC}"
        fi
    else
        echo -e "${RED}✗ Prisma directory not found${NC}"
    fi
    
    echo -e "\n${GREEN}Environment validation complete${NC}"
    read -p "Press Enter to continue..."
    return 0
}

# Function to check database connection
check_database_connection() {
    echo -e "\n${YELLOW}Checking database connection...${NC}"
    
    # Use Prisma to validate the connection
    echo -e "${YELLOW}Validating Prisma schema...${NC}"
    npx prisma validate
    PRISMA_RESULT=$?
    
    if [ $PRISMA_RESULT -eq 0 ]; then
        echo -e "${GREEN}✓ Database schema validated successfully${NC}"
    else
        echo -e "${RED}✗ Database schema validation failed${NC}"
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
                echo -e "$DB_TEST"
            fi
        else
            echo -e "${RED}✗ PostgreSQL container is not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Docker not found. Skipping container check.${NC}"
    fi
    
    read -p "Press Enter to continue..."
    return 0
}

# Main logic
while true; do
    display_menu
    read choice
    
    case $choice in
        1) 
            echo -e "\n${YELLOW}Running all tests...${NC}"
            ./scripts/test-automation/run-all-tests.sh
            read -p "Press Enter to continue..."
            ;;
        2)
            echo -e "\n${YELLOW}Running database tests...${NC}"
            ./scripts/test-automation/run-db-tests.sh
            read -p "Press Enter to continue..."
            ;;
        3)
            echo -e "\n${YELLOW}Running CI tests...${NC}"
            ./scripts/test-automation/run-ci-tests.sh
            read -p "Press Enter to continue..."
            ;;
        4)
            echo -e "\n${YELLOW}Running security checks...${NC}"
            ./scripts/test-automation/security-check.sh
            read -p "Press Enter to continue..."
            ;;
        5)
            echo -e "\n${YELLOW}Installing git hooks...${NC}"
            ./scripts/test-automation/install-git-hooks.sh
            read -p "Press Enter to continue..."
            ;;
        6)
            validate_environment
            ;;
        7)
            check_database_connection
            ;;
        8)
            echo -e "\n${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "\n${RED}Invalid option. Please try again.${NC}"
            read -p "Press Enter to continue..."
            ;;
    esac
done
