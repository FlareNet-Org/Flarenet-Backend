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

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
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

## License

MIT 