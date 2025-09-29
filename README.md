# FlareNet Backend

Backend service for FlareNet deployment platform.

## React Project Validation API

The API provides endpoints to validate if a GitHub repository contains a React project.

### Endpoints

#### 1. Validate by Owner/Repo

```
GET /api/validate/react?owner={owner}&repo={repo}
```

**Headers:**
- `Authorization`: GitHub token (required)

**Query Parameters:**
- `owner`: GitHub repository owner (required)
- `repo`: GitHub repository name (required)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/validate/react?owner=facebook&repo=create-react-app" \
  -H "Authorization: Bearer ghp_your_github_token"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Valid React project",
  "data": {
    "framework": "Create React App",
    "buildCommand": "npm run build",
    "dependencies": {
      "react": "^18.2.0"
    }
  }
}
```

#### 2. Validate by URL

```
GET /api/validate/react-by-url?url={url}
```

**Headers:**
- `Authorization`: GitHub token (required)

**Query Parameters:**
- `url`: GitHub repository URL (required)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/validate/react-by-url?url=https://github.com/facebook/create-react-app" \
  -H "Authorization: Bearer ghp_your_github_token"
```

#### 3. Check React Repo (POST)

```
POST /api/check-react-repo
```

**Headers:**
- `Authorization`: GitHub token (required)
- `Content-Type`: application/json

**Request Body:**
```json
{
  "url": "https://github.com/facebook/create-react-app"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/check-react-repo" \
  -H "Authorization: Bearer ghp_your_github_token" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/facebook/create-react-app"}'
```

### Error Responses

The API returns appropriate error codes and messages:

- **401**: GitHub token is missing or invalid
- **400**: Missing required parameters or invalid repository
- **404**: Repository or package.json not found
- **429**: GitHub API rate limit exceeded
- **500**: Server error

## Development

### Prerequisites

- Node.js (v14+)
- Redis (optional, for caching)

### Environment Variables

Create a `.env` file with:

```
# Server
PORT=3000
NODE_ENV=development

# Redis Configuration
# Option 1: Redis Cloud (preferred for production)
REDIS_URL=redis://:password@redis-15621.crce217.ap-south-1-1.ec2.redns.redis-cloud.com:15621
REDIS_USE_TLS=true
REDIS_ENABLED=true

# Option 2: Local Redis (for development)
# REDIS_ENABLED=true
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
```

### Running the Server

```bash
npm install
npm start
```

### Running Tests

Basic test execution:

```bash
npm test
```

### Automated Test Scripts

The project includes several automated test scripts to streamline development workflows:

```bash
# On Linux/Mac/Git Bash:
./scripts/test-automation/test-utility.sh

# On Windows:
scripts\test-automation\run-tests.bat
```

Available test automation scripts:

- **run-all-tests.sh**: Runs all tests with comprehensive reporting
- **run-db-tests.sh**: Focuses on database-specific tests
- **pre-commit-tests.sh**: Quick tests to run before committing changes
- **run-ci-tests.sh**: Complete test suite for CI environments
- **security-check.sh**: Performs security audits
- **install-git-hooks.sh**: Sets up Git hooks for automated testing

To install Git hooks for automated testing:

```bash
./scripts/test-automation/install-git-hooks.sh
```

## Security Practices

### Redis Cloud Configuration

The application supports connecting to Redis Cloud for production environments:

- Connection uses the full Redis URL format with proper authentication
- TLS support for secure connection to Redis Cloud
- Fallback to local Redis for development environments
- Enhanced error handling and reconnection strategies
- Automatic queue configuration based on available connection method

Example Redis Cloud configuration in .env:

```
# Redis Cloud configuration
REDIS_URL=redis://:password@redis-15621.crce217.ap-south-1-1.ec2.redns.redis-cloud.com:15621
REDIS_USE_TLS=true
REDIS_ENABLED=true
```

### Database Connection Security

The application uses secure methods for handling database credentials:

- Connection strings are parsed using the URL API instead of regex extraction
- Credentials are not exposed in logs or error messages
- Database passwords are only used for their intended purpose
- Test files include conditional execution to prevent unnecessary connection attempts

Example of secure database configuration:

```javascript
// Extract connection details safely without exposing password in code
const getDbConfig = () => {
  try {
    const url = new URL(process.env.DATABASE_URL || '');
    return {
      user: url.username,
      password: url.password, // Will be used securely and not logged
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.substring(1).split('?')[0]
    };
  } catch (e) {
    console.error('Invalid connection string format');
    return { user: '', password: '', host: '', port: 5432, database: '' };
  }
};
```

## Redis Integration

The FlareNet Backend can be configured to use either local Redis (via Docker) or Redis Cloud:

### Local Redis (Development)

By default, the application uses a Redis instance provided by Docker Compose. This is configured in the `.env` file.

### Redis Cloud (Production)

For production environments, the application is configured to use Redis Cloud with enhanced connection management:

1. Configure your Redis Cloud credentials in the `.env.redis-cloud` file
2. Start the application using the provided scripts:

```bash
# Windows
.\start-with-redis-cloud.bat

# Linux/macOS
./start-with-redis-cloud.sh

# Docker
docker-compose -f docker-compose.redis-cloud.yml up
```

For detailed instructions on setting up and configuring Redis Cloud, see [Redis Cloud Setup Guide](docs/REDIS_CLOUD_SETUP.md).

> **IMPORTANT:** For security best practices and handling sensitive information in this project, see [Security Guidelines](docs/SECURITY.md).

### Verifying Database Services

To verify that your Redis and PostgreSQL services are configured correctly, run:

```bash
# Run the database verification script
node scripts/verify-database-services.js
```

This script checks:
- Redis Cloud configuration and connection
- PostgreSQL configuration and connection
- Security issues like exposed credentials

For detailed verification steps, see [Database Verification Guide](docs/DATABASE_VERIFICATION.md).
```

For detailed instructions on setting up and using Redis Cloud, see [Redis Cloud Integration Guide](./docs/REDIS_CLOUD.md).

## License

MIT 