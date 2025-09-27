@echo off
REM FlareNet Backend Test Automation Windows Wrapper
REM This script helps run bash scripts on Windows

echo ========================================
echo    FlareNet Backend Test Automation     
echo ========================================

REM Check if bash is available via Git for Windows or WSL
WHERE bash >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: bash not found. Please install Git for Windows or WSL.
    echo You can download Git for Windows from: https://git-scm.com/download/win
    pause
    exit /b 1
)

:MENU
cls
echo ========================================
echo    FlareNet Backend Test Automation    
echo ========================================
echo Choose an option:
echo ----------------------------------------
echo 1. Run all tests
echo 2. Run database tests
echo 3. Run CI tests
echo 4. Run security checks
echo 5. Install git hooks
echo 6. Validate environment
echo 7. Check database connection
echo 8. Exit
echo ========================================

set /p choice="Enter your choice [1-8]: "

IF "%choice%"=="1" (
    echo Running all tests...
    bash ./scripts/test-automation/run-all-tests.sh
    pause
    goto MENU
)

IF "%choice%"=="2" (
    echo Running database tests...
    bash ./scripts/test-automation/run-db-tests.sh
    pause
    goto MENU
)

IF "%choice%"=="3" (
    echo Running CI tests...
    bash ./scripts/test-automation/run-ci-tests.sh
    pause
    goto MENU
)

IF "%choice%"=="4" (
    echo Running security checks...
    bash ./scripts/test-automation/security-check.sh
    pause
    goto MENU
)

IF "%choice%"=="5" (
    echo Installing git hooks...
    bash ./scripts/test-automation/install-git-hooks.sh
    pause
    goto MENU
)

IF "%choice%"=="6" (
    echo Validating environment...
    bash -c "source ./scripts/test-automation/test-utility.sh; validate_environment"
    pause
    goto MENU
)

IF "%choice%"=="7" (
    echo Checking database connection...
    bash -c "source ./scripts/test-automation/test-utility.sh; check_database_connection"
    pause
    goto MENU
)

IF "%choice%"=="8" (
    echo Goodbye!
    exit /b 0
)

echo Invalid option. Please try again.
pause
goto MENU
