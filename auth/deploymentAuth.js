const ReactProjectValidator = require('../services/validation/reactProjectValidator');

/**
 * Middleware to validate if a repository is a React project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with validation result
 */
const validateReactProject = async (req, res) => {
    try {
        const { owner, repo } = req.query;
        // Get token from Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : authHeader;

        // Input validation
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "GitHub token is required in Authorization header"
            });
        }

        if (!owner || !repo) {
            return res.status(400).json({ 
                success: false,
                message: "Repository owner and name are required"
            });
        }

        // Create validator instance
        const validator = new ReactProjectValidator({ cacheTTL: 3600 });
        
        // Validate repository
        const result = await validator.validateReactProject({ owner, repo, token });

        if (!result.isValid) {
            return res.status(400).json({
                success: false,
                message: result.error || "Invalid React project"
            });
        }

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Valid React project",
            data: {
                framework: result.framework,
                buildCommand: result.buildCommand,
                dependencies: result.dependencies
            }
        });
    } catch (error) {
        console.error('React project validation error:', error);
        
        // Handle specific error types
        if (error.message.includes('rate limit')) {
            return res.status(429).json({
                success: false,
                message: "GitHub API rate limit exceeded. Please try again later."
            });
        }
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('token')) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired GitHub token"
            });
        }
        
        // Generic error response
        return res.status(500).json({
            success: false,
            message: "Internal server error during validation",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Middleware to validate a GitHub repository URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with validation result
 */
const validateReactProjectByUrl = async (req, res) => {
    try {
        const { url } = req.query;
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : authHeader;

        // Input validation
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "GitHub token is required in Authorization header"
            });
        }

        if (!url) {
            return res.status(400).json({ 
                success: false,
                message: "GitHub repository URL is required"
            });
        }

        // Create validator instance
        const validator = new ReactProjectValidator({ cacheTTL: 3600 });
        
        // Validate repository URL
        const result = await validator.validateReactProjectByUrl(url, token);

        if (!result.isValid) {
            return res.status(400).json({
                success: false,
                message: result.error || "Invalid React project"
            });
        }

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Valid React project",
            data: {
                framework: result.framework,
                buildCommand: result.buildCommand,
                dependencies: result.dependencies
            }
        });
    } catch (error) {
        console.error('React project validation error:', error);
        
        // Handle specific error types
        if (error.message.includes('rate limit')) {
            return res.status(429).json({
                success: false,
                message: "GitHub API rate limit exceeded. Please try again later."
            });
        }
        
        if (error.message.includes('URL')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        // Generic error response
        return res.status(500).json({
            success: false,
            message: "Internal server error during validation",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    validateReactProject,
    validateReactProjectByUrl
};