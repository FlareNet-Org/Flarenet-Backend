const { validateReactProject, validateReactProjectByUrl } = require('../auth/deploymentAuth');
const ReactProjectValidator = require('../services/validation/reactProjectValidator');

// Mock the ReactProjectValidator class
jest.mock('../services/validation/reactProjectValidator');

describe('React Project Validator Middleware', () => {
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request object
    mockReq = {
      query: {
        owner: 'testOwner',
        repo: 'testRepo',
        url: 'https://github.com/testOwner/testRepo'
      },
      headers: {
        authorization: 'Bearer test-token'
      },
      body: {}
    };
    
    // Mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock ReactProjectValidator implementation
    ReactProjectValidator.mockImplementation(() => ({
      validateReactProject: jest.fn().mockResolvedValue({
        isValid: true,
        framework: 'Next.js',
        buildCommand: 'npm run build',
        dependencies: { react: '^18.0.0' }
      }),
      validateReactProjectByUrl: jest.fn().mockResolvedValue({
        isValid: true,
        framework: 'Create React App',
        buildCommand: 'npm run build',
        dependencies: { react: '^17.0.2' }
      })
    }));
  });
  
  describe('validateReactProject', () => {
    test('should return 401 if GitHub token is missing', async () => {
      // Arrange
      mockReq.headers.authorization = undefined;
      
      // Act
      await validateReactProject(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('token')
      }));
    });
    
    test('should return 400 if owner or repo is missing', async () => {
      // Arrange
      mockReq.query.owner = undefined;
      
      // Act
      await validateReactProject(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('owner')
      }));
    });
    
    test('should return 200 with valid React project data', async () => {
      // Act
      await validateReactProject(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          framework: 'Next.js'
        })
      }));
    });
    
    test('should return 400 for non-React projects', async () => {
      // Arrange
      ReactProjectValidator.mockImplementation(() => ({
        validateReactProject: jest.fn().mockResolvedValue({
          isValid: false,
          error: 'This is not a React project'
        })
      }));
      
      // Act
      await validateReactProject(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'This is not a React project'
      }));
    });
    
    test('should handle package.json not found error', async () => {
      // Arrange
      ReactProjectValidator.mockImplementation(() => ({
        validateReactProject: jest.fn().mockResolvedValue({
          isValid: false,
          error: "File 'package.json' not found in repository testOwner/testRepo"
        })
      }));
      
      // Act
      await validateReactProject(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('package.json')
      }));
    });
    
    test('should handle rate limit exceeded error', async () => {
      // Arrange
      ReactProjectValidator.mockImplementation(() => ({
        validateReactProject: jest.fn().mockResolvedValue({
          isValid: false,
          error: 'GitHub API rate limit exceeded. Please try again later.'
        })
      }));
      
      // Act
      await validateReactProject(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('rate limit')
      }));
    });
  });
  
  describe('validateReactProjectByUrl', () => {
    test('should return 401 if GitHub token is missing', async () => {
      // Arrange
      mockReq.headers.authorization = undefined;
      
      // Act
      await validateReactProjectByUrl(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('token')
      }));
    });
    
    test('should return 400 if URL is missing', async () => {
      // Arrange
      mockReq.query.url = undefined;
      
      // Act
      await validateReactProjectByUrl(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('URL')
      }));
    });
    
    test('should return 200 with valid React project data from URL', async () => {
      // Act
      await validateReactProjectByUrl(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          framework: 'Create React App'
        })
      }));
    });
    
    test('should return 400 for invalid GitHub URL', async () => {
      // Arrange
      ReactProjectValidator.mockImplementation(() => ({
        validateReactProjectByUrl: jest.fn().mockResolvedValue({
          isValid: false,
          error: 'Invalid GitHub URL format'
        })
      }));
      
      // Act
      await validateReactProjectByUrl(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid GitHub URL format'
      }));
    });
  });
}); 