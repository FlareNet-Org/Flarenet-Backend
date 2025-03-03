const { prisma } = require("../prismaClient");
const buildQueue = require("../../queues/buildQueue");
const { llm, memory } = require("../../utils/langchainConfig");
const Redis = require("ioredis");
require('dotenv').config({ path: 'd:/Node  js/version control build service/api-server-spinner/.env' });

// deploy my project as my project name is shopify  and description is e com project  ownerid is 1 and my gitUrl is https://github.com/sahil28032005/shopify.git start my deployment 
const redis = new Redis(process.env.REDIS_HOST, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3
});

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis Client Connected'));

const chatbotController = async (req, res) => {
    try {
        const { message, userId } = req.body;
        if (!userId) return res.status(400).json({ message: "User ID is required." });

        let session = await getUserSession(userId);
        console.log("Current session:", session);

        // Enhanced extraction prompt
        const extractionPrompt = `Analyze this message and extract project details. For any missing or unclear values, return null.
        Message: "${message}"
        Current session values:
        - Name: ${session.name}
        - Git URL: ${session.gitUrl}
        - Description: ${session.description}
        - Owner ID: ${session.ownerId}
        
        Return ONLY a JSON object with any new or updated values:
        {
            "name": "extracted or null",
            "gitUrl": "extracted or null",
            "description": "extracted or null",
            "ownerId": "extracted or null"
        }`;

        const extractedParams = await llm.predict(extractionPrompt);
        
        let userParams;
        try {
            const jsonStart = extractedParams.indexOf('{');
            const jsonEnd = extractedParams.lastIndexOf('}') + 1;
            const cleanJson = extractedParams.slice(jsonStart, jsonEnd);
            userParams = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON parsing error:", e);
            userParams = { 
                name: null, 
                gitUrl: null, 
                description: null, 
                ownerId: null 
            };
        }

        console.log("Newly extracted params:", userParams);

        // Update session with new valid parameters
        let updatedValues = false;
        Object.entries(userParams).forEach(([key, value]) => {
            if (value && value !== "null" && value !== session[key]) {
                session[key] = value;
                session.askedParams.delete(key);
                updatedValues = true;
            }
        });

        if (updatedValues) {
            await saveUserSession(userId, session);
            console.log("Session updated with new values");
        }

        // Enhanced missing parameters handling
        const missingParams = ["name", "gitUrl", "description", "ownerId"].filter(param => !session[param]);

        if (missingParams.length > 0) {
            const nextParam = missingParams.find(param => !session.askedParams.has(param));
            if (nextParam) {
                session.askedParams.add(nextParam);
                
                // Enhanced AI prompt for missing values
                const promptTemplate = `Create a friendly prompt asking for the ${nextParam}.
                Context: User has provided ${4 - missingParams.length}/4 details.
                Already provided: ${Object.entries(session)
                    .filter(([key, value]) => value && ["name", "gitUrl", "description", "ownerId"].includes(key))
                    .map(([key, value]) => `${key}: ${value}`).join(", ")}
                Make it engaging and clear what information is needed.`;
                
                const prompt = await llm.predict(promptTemplate);
                await saveUserSession(userId, session);
                return res.json({ reply: prompt });
            }
        }

        // Validate parameters
        const validationErrors = validateParams(session);
        if (validationErrors.length > 0) {
            return res.json({ reply: `Oops! Found some issues:\n- ${validationErrors.join("\n- ")}` });
        }

        // Add confirmation step
        if (!message.toLowerCase().includes('confirm') && !message.toLowerCase().includes('yes')) {
            const confirmationPrompt = `Great! I have all the details:
            - Project Name: ${session.name}
            - Description: ${session.description}
            - Git URL: ${session.gitUrl}
            - Owner ID: ${session.ownerId}
            
            Please confirm if you want to proceed with the deployment (reply with 'yes' or 'confirm').`;
            
            await saveUserSession(userId, session);
            return res.json({ reply: confirmationPrompt });
        }

        // Store project in DB
        const createdProject = await prisma.project.create({
            data: { name: session.name, gitUrl: session.gitUrl, description: session.description, ownerId: parseInt(session.ownerId) },
        });

        console.log("project created");

        const createdDeployment = await prisma.deployment.create({
            data: { projectId: createdProject.id, status: "PENDING" },
        });

        console.log("deployment created");

        // Queue the deployment
        await buildQueue.add('deploy', {
            deploymentId: createdDeployment.id,
            gitUrl: session.gitUrl,
            projectId: createdProject.id
        });

        console.log("deployment updated by adding job");

        // await redis.del(`session:${userId}`);

        return res.json({ reply: `✅ Your project "${session.name}" has been successfully added to the build queue! 🎉` });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Redis Helper Functions
const getUserSession = async (userId) => {
    const session = await redis.get(`session:${userId}`);
    if (session) {
        console.log("user identified tr=hrough cache");
        const parsedSession = JSON.parse(session);
        // Ensure askedParams is an array before converting to Set
        parsedSession.askedParams = new Set(Array.isArray(parsedSession.askedParams) ? parsedSession.askedParams : []);
        return parsedSession;
    }
    return {
        name: null,
        gitUrl: null,
        description: null,
        ownerId: null,
        askedParams: new Set()
    };
};

const saveUserSession = async (userId, session) => {
    // Convert Set to Array for JSON serialization
    const sessionToSave = {
        ...session,
        askedParams: Array.from(session.askedParams)
    };
    await redis.set(`session:${userId}`, JSON.stringify(sessionToSave), "EX", 3600);
};

// Validate Inputs
const validateParams = (session) => {
    const errors = [];
    if (!session.name || session.name.length < 2) errors.push("Project name must be at least 2 characters.");
    if (!session.description || session.description.length < 5) errors.push("Project description must be at least 5 characters.");
    if (!session.ownerId || isNaN(parseInt(session.ownerId))) errors.push("Owner ID must be a valid number.");
    if (!session.gitUrl || !/^https?:\/\/github\.com\/[\w-]+\/[\w-]+(?:\.git)?$/i.test(session.gitUrl)) {
        errors.push("Git URL must be a valid GitHub repository.");
    }
    return errors;
};

module.exports = { chatbotController };
