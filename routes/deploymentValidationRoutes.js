const express = require('express');
const router = express.Router();
const { validateReactProject, validateReactProjectByUrl } = require('../auth/deploymentAuth');

/**
 * @route GET /api/validate/react
 * @desc Validate if a GitHub repository is a React project (using owner/repo)
 * @access Private (requires GitHub token)
 */
router.get('/react', validateReactProject);

/**
 * @route GET /api/validate/react-by-url
 * @desc Validate if a GitHub repository is a React project (using URL)
 * @access Private (requires GitHub token)
 */
router.get('/react-by-url', validateReactProjectByUrl);

/**
 * @route POST /api/check-react-repo
 * @desc Validate if a GitHub repository is a React project (using URL in request body)
 * @access Private (requires GitHub token)
 */
router.post('/check-react-repo', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'GitHub repository URL is required'
            });
        }
        
        // Forward the request to the validateReactProjectByUrl middleware
        req.query.url = url;
        return validateReactProjectByUrl(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;