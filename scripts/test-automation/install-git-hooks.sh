#!/bin/bash
# Git Hooks Installer for FlareNet Backend
# This script installs Git hooks for automated testing

# Define colors for better output visibility
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   FlareNet Backend Git Hooks Setup     ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if .git directory exists
if [ ! -d .git ]; then
    echo -e "${RED}✗ No .git directory found. Are you in the root of a Git repository?${NC}"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
echo -e "${YELLOW}Creating pre-commit hook...${NC}"
cat > .git/hooks/pre-commit << 'EOL'
#!/bin/bash
# Pre-commit hook for FlareNet Backend
# This hook runs tests before allowing a commit

# Path to the pre-commit tests script
SCRIPT="./scripts/test-automation/pre-commit-tests.sh"

if [ -x "$SCRIPT" ]; then
    echo "Running pre-commit tests..."
    "$SCRIPT"
    RESULT=$?
    
    if [ $RESULT -ne 0 ]; then
        echo "Tests failed. Commit aborted."
        exit 1
    fi
else
    echo "Warning: Pre-commit test script not found or not executable"
    echo "Expected at: $SCRIPT"
    echo "Continuing with commit anyway"
fi

exit 0
EOL

chmod +x .git/hooks/pre-commit

# Create pre-push hook
echo -e "${YELLOW}Creating pre-push hook...${NC}"
cat > .git/hooks/pre-push << 'EOL'
#!/bin/bash
# Pre-push hook for FlareNet Backend
# This hook runs more comprehensive tests before allowing a push

# Path to the CI tests script
SCRIPT="./scripts/test-automation/run-ci-tests.sh"

# Check if this is a force push
while read local_ref local_sha remote_ref remote_sha
do
    # Skip on force push (--force, -f)
    if [[ "$remote_sha" = "0000000000000000000000000000000000000000" ]]; then
        echo "Force push detected, skipping tests"
        exit 0
    fi
done

if [ -x "$SCRIPT" ]; then
    echo "Running pre-push tests..."
    "$SCRIPT"
    RESULT=$?
    
    if [ $RESULT -ne 0 ]; then
        echo "Tests failed. Push aborted."
        exit 1
    fi
else
    echo "Warning: Pre-push test script not found or not executable"
    echo "Expected at: $SCRIPT"
    echo "Continuing with push anyway"
fi

exit 0
EOL

chmod +x .git/hooks/pre-push

echo -e "${GREEN}✓ Git hooks installed successfully${NC}"
echo -e "${YELLOW}The following hooks were set up:${NC}"
echo -e "  - pre-commit: runs focused tests based on changed files"
echo -e "  - pre-push: runs comprehensive CI tests"
echo -e "\n${BLUE}To temporarily bypass hooks, use:${NC}"
echo -e "  - git commit --no-verify"
echo -e "  - git push --no-verify"

exit 0
