const GitHubService = require('../github/githubService');

/**
 * Service for validating React projects
 */
class ReactProjectValidator {
  /**
   * Create a new ReactProjectValidator instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.githubService = new GitHubService(options);
  }

  /**
   * Validate if a repository is a React project
   * @param {Object} params - Validation parameters
   * @param {String} params.owner - Repository owner
   * @param {String} params.repo - Repository name
   * @param {String} params.token - GitHub token
   * @returns {Promise<Object>} Validation result
   */
  async validateReactProject({ owner, repo, token }) {
    try {
      // Input validation
      if (!owner || !repo) {
        throw new Error('Repository owner and name are required');
      }

      if (!token) {
        throw new Error('GitHub token is required');
      }

      // Get package.json from repository
      const packageJson = await this.githubService.getFileContent({
        owner,
        repo,
        path: 'package.json',
        token
      });

      // Check if it's a React project
      const isReact = this.hasReactDependency(packageJson);
      if (!isReact) {
        throw new Error('This is not a React project');
      }

      // Detect React framework
      const { framework, buildCommand } = this.detectReactFramework(packageJson);

      return {
        isValid: true,
        framework,
        buildCommand,
        dependencies: {
          react: packageJson.dependencies?.react || packageJson.devDependencies?.react,
          ...this.getRelevantDependencies(packageJson)
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Check if package.json has React dependency
   * @param {Object} packageJson - package.json content
   * @returns {Boolean} Has React dependency
   */
  hasReactDependency(packageJson) {
    if (!packageJson) return false;
    
    return Boolean(
      packageJson.dependencies?.react || 
      packageJson.devDependencies?.react
    );
  }

  /**
   * Get relevant dependencies from package.json
   * @param {Object} packageJson - package.json content
   * @returns {Object} Relevant dependencies
   */
  getRelevantDependencies(packageJson) {
    const relevantDeps = {};
    const depsToCheck = [
      'vite', 'react-scripts', 'next', 'gatsby',
      'webpack', 'babel', 'typescript', 'eslint'
    ];
    
    for (const dep of depsToCheck) {
      if (packageJson.dependencies?.[dep]) {
        relevantDeps[dep] = packageJson.dependencies[dep];
      } else if (packageJson.devDependencies?.[dep]) {
        relevantDeps[dep] = packageJson.devDependencies[dep];
      }
    }
    
    return relevantDeps;
  }

  /**
   * Detect React framework from package.json
   * @param {Object} packageJson - package.json content
   * @returns {Object} Framework and build command
   */
  detectReactFramework(packageJson) {
    if (!packageJson) {
      return { framework: 'Unknown', buildCommand: 'npm run build' };
    }

    // Check for specific React frameworks
    if (packageJson.dependencies?.vite || packageJson.devDependencies?.vite) {
      return { framework: 'Vite', buildCommand: this.getBuildCommand(packageJson, 'build') };
    } else if (packageJson.dependencies?.['react-scripts']) {
      return { framework: 'Create React App', buildCommand: this.getBuildCommand(packageJson, 'build') };
    } else if (packageJson.dependencies?.next) {
      return { framework: 'Next.js', buildCommand: this.getBuildCommand(packageJson, 'build') };
    } else if (packageJson.dependencies?.gatsby) {
      return { framework: 'Gatsby', buildCommand: this.getBuildCommand(packageJson, 'build') };
    } else {
      return { framework: 'Custom React', buildCommand: this.getBuildCommand(packageJson, 'build') };
    }
  }

  /**
   * Get build command from package.json scripts
   * @param {Object} packageJson - package.json content
   * @param {String} defaultScript - Default script name
   * @returns {String} Build command
   */
  getBuildCommand(packageJson, defaultScript = 'build') {
    if (packageJson.scripts && packageJson.scripts[defaultScript]) {
      return `npm run ${defaultScript}`;
    }
    
    // Look for alternative build scripts
    const buildScripts = ['build', 'prod', 'production', 'compile'];
    for (const script of buildScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        return `npm run ${script}`;
      }
    }
    
    return 'npm run build';
  }

  /**
   * Validate a GitHub repository URL
   * @param {String} url - GitHub repository URL
   * @param {String} token - GitHub token
   * @returns {Promise<Object>} Validation result
   */
  async validateReactProjectByUrl(url, token) {
    try {
      const { owner, repo } = this.githubService.parseGitHubUrl(url);
      return await this.validateReactProject({ owner, repo, token });
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = ReactProjectValidator; 