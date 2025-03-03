const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const deploymentTool = tool(
    async ({ repoUrl }) => {
        // Your deployment logic here
        return `Deploying from repo: ${repoUrl}`;
    },
    {
        name: "deploymentTool",
        description: "Deploy a service using a given Git repository URL.",
        schema: z.object({
            repoUrl: z.string().url(),
        }),
    }
);

module.exports = { deploymentTool };
