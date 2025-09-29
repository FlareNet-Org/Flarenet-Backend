const express = require('express');
const clickHouseClient = require('./utils/clickHouseClient');
const { prisma } = require('./utils/prismaClient');
const { z } = require("zod");
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables - prioritize explicitly passed path first,
// then try Redis Cloud config, then fall back to development
const configPath = process.env.dotenv_config_path;
const redisCloudPath = path.resolve(__dirname, '.env.redis-cloud');
const defaultEnvPath = path.resolve(__dirname, '.env.development');

// Load Redis Cloud configuration if the REDIS_CLOUD env var is set
if (process.env.REDIS_CLOUD === 'true') {
  console.log('REDIS_CLOUD flag is true, loading Redis Cloud configuration exclusively');
  dotenv.config({ path: redisCloudPath, override: true });
} 
// If a specific path was provided via command line, use that exclusively
else if (configPath) {
  console.log(`Loading configuration from command line path: ${configPath}`);
  dotenv.config({ path: configPath });
} 
// Otherwise try Redis Cloud first, then default
else {
  console.log('Loading Redis Cloud configuration first, then development config');
  // Force Redis Cloud by setting environment variable before loading config
  process.env.REDIS_CLOUD = 'true';
  dotenv.config({ path: redisCloudPath, override: true });
  // Only load development config for non-Redis settings
  dotenv.config({ path: defaultEnvPath });
}

// Log the loaded configuration
console.log('========= REDIS CONFIGURATION =========');
console.log('Active Redis URL:', process.env.REDIS_URL ? 'Defined (using Redis Cloud)' : 'Undefined (using local Redis)');
console.log('Redis TLS:', process.env.REDIS_USE_TLS);
console.log('Redis Host:', process.env.REDIS_HOST);
console.log('Redis Port:', process.env.REDIS_PORT);
console.log('Redis Connection Timeout:', process.env.REDIS_CONNECT_TIMEOUT || '30000');
console.log('Redis Retry Strategy Enabled:', process.env.REDIS_RETRY_STRATEGY || 'false');
console.log('Redis Max Retries:', process.env.REDIS_MAX_RETRIES || '10');
console.log('=========================================');

const cors = require('cors');
const buildQueue = require('./queues/buildQueue');
const githubRoutes = require('./routes/githubRoutes');
const authRoutes = require('./routes/autthRoutes');
const chatbotRoutes = require("./routes/chatBotRoutes");
const { getRedisClient } = require('./utils/redisClient');

// Initialize Redis client early
process.env.REDIS_ENABLED = 'true';
const redisClient = getRedisClient();
const deploymentValidationRoutes = require('./routes/deploymentValidationRoutes');
const aiAnalysisRoutes = require('./routes/aiAnalysisRoutes');
const { Worker: ThreadWorker } = require('worker_threads');

const app = express();
app.use(cors({ origin: '*' })); //main cross origin middleware to allow traffic from anywhere

const PORT = 5000;

// Express 5.x middleware configuration
// Note: Express 5 has some breaking changes from Express 4
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Disable X-Powered-By header for security
app.disable('x-powered-by');
//routes
app.use('/api/github', githubRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/validdeployment', deploymentValidationRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
//chatBot rouutes
app.use('/api/llm', chatbotRoutes);
//auth routes

async function main() {
    // Log to indicate the connection attempt
    // console.log('Attempting to connect to the database...');

    try {
        // Run a simple query to test the connection
        const users = await prisma.user.findMany();

        // Log successful query result
        console.log('Successfully connected to the database and fetched users:', users);
    } catch (error) {
        // Log any error that happens during the query
        console.error('Error connecting to the database or fetching users:', error);
    }
}
const startWorkerThreads = () => {
    //update path to point to the worker folder
    const workerFiles = ['deploymentWorker.js', 'failedQueueWorker.js', 'webHooksWorker.js'].map((file) =>
        path.join(__dirname, 'worker', file));;

    //start each workrt using seperate pareller threads
    workerFiles.forEach((file) => {
        const workerThread = new ThreadWorker(file);
        // console.log(`started worker thread for ${file}`);
        workerThread.on('error', (err) => {
            console.error(`Error in worker thread for ${file}`, err);
        });
    });
}


const config = {
    CLUSTER: process.env.FLARENET_AWS_CLUSTER_NAME,
    TASK: 'git_project_cloner_task:4'
}


//for creating project this route wil be used
app.post('/create-project', async function (req, res) {
    try {
        //validate using zod

        //created validator schema
        const createProjectSchema = z.object({
            name: z.string().min(1, "project name is required"),
            gitUrl: z.string().url("Invalid git url"),
            description: z.string().optional(),
            ownerId: z.number().int().positive("invallid ownerid"),
        });

        //parse check body as it is according to schema
        const isValidated = createProjectSchema.parse(req.body);
        if (isValidated.error) return res.status(404).json({ error: isValidated.error });

        //after proper validation insert that data into database
        const newProject = await prisma.project.create({
            data: {
                name: isValidated.name,
                gitUrl: isValidated.gitUrl,
                description: isValidated.description || null,
                owner: {
                    connect: { id: isValidated.ownerId }, // Ensure `newUser.id` exists in the database
                }
            },
        });

        //respond with project creation siccess
        res.status(200).send({
            success: true,
            message: 'Project created successfully!',
            project: isValidated.ownerId
        });
    }
    catch (e) {
        res.status(401).send({
            succsee: false,
            message: 'problem for creating project',
            error: e.message
        });
    }
});


//for getting user projects using ownerId as an unique foreign key realtion
app.get("/projects/:ownerId", async function (req, res) {
    try {
        const ownerId = parseInt(req.params.ownerId, 10);
        if (isNaN(ownerId)) {
            return res.status(400).send({
                success: false,
                message: "Invalid ownerId ptovidee",
            });
        }
        //otherwise fetach all projects from the owner as per necessatity
        const projects = await prisma.project.findMany({
            where: { ownerId },
            include: {
                deployments: true,
                owner: true
            }
        });

        //return all found projects from that ownerId
        res.status(200).send({
            success: true,
            data: projects
        });
    }
    catch (e) {
        return res.status(404).send({
            success: false,
            message: 'response error from api',
            error: e.message
        });
    }
});


//main deployer actual via bullmq queue

app.post('/deploy', async (req, res) => {
    //all is dependent on just projectId
    try {
        //make zod schema for deployment validation
        const deploymentSchema = z.object({
            projectId: z.string().uuid("Invalid project ID"),  // Ensure it matches UUID format
            environment: z.enum(["DEV", "STAGING", "PROD"], { message: "Invalid environment" }).default("STAGING"),
            status: z.enum(["INACTIVE", "ACTIVE", "FAILED"]).optional().default("INACTIVE"),
            version: z.string().optional(),  // Optional version or tag
            autoDeploy: z.boolean().optional().default(false),  // Auto-deploy feature
            buildCommand: z.string().min(1, "Build command is required").optional().or(z.literal("")), // Allow empty string
            envVariables: z.array(z.object({
                key: z.string().min(1, "Key is required"),
                value: z.string().min(1, "Value is required")
            })).optional().default([]), // Default empty array if not provided
        });


        // Step 1: Validate input
        // Remove empty env vars before validation
        if (req.body.envVariables) {
            req.body.envVariables = req.body.envVariables.filter(env => env.key.trim() !== "" && env.value.trim() !== "");
        }

        const validatedData = deploymentSchema.parse(req.body);

        //extract env variables from validated data
        const { envVariables } = validatedData;  // Extract envVariables from the validated data
        // Prepare the environment variables in the correct format for Docker container
        // Prepare ECS environment variables in the correct format
        const envVars = envVariables ? envVariables.map(({ key, value }) => ({
            name: key,
            value
        })) : [];
        //generate url if user provided custom uri handle logic for it otherwiswe make use of default name
        const generatedUri = validatedData.url || `https://${validatedData.projectId}.localhost:9000`;

        // Step 2: Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: validatedData.projectId },
        });



        if (!project) {
            return res.status(404).send({
                success: false,
                message: "Project not found",
            });
        }
        //first check there is nor running deployment


        //mark tht deploymenr entry in the database
        const newDeployment = await prisma.deployment.create({
            data: {
                projectId: validatedData.projectId,
                environment: validatedData.environment,
                status: validatedData.status,
                url: generatedUri,
                version: validatedData.version || "v1.0.0", // Provide a default version
                autoDeploy: validatedData.autoDeploy, // Include autoDeploy here
            },
            //this include is just like populate() in mongodb or fetch_assoc() in php and readRecursive() in ruby as an powerful tree of tech stacks 
            include: {
                project: true, // Fetch related project data
            },
        });
        // console.log("deployment added in prisma for deployment id", newDeployment.id);
        //here add job to the deployment queue inseted of deploying it directly
        await buildQueue.add('deploy', {
            deploymentId: newDeployment.id, projectId: newDeployment.project.id, environment: validatedData.environment, gitUrl: newDeployment.project.gitUrl, version: validatedData.version || "v1.0.0", buildCommand: validatedData.buildCommand && validatedData.buildCommand.trim() !== "" ? validatedData.buildCommand : "npm install && npm run build",
            envVars: validatedData.envVariables?.length ? validatedData.envVariables : [],
        });
        // console.log("Job added to main build queue with build command:", validatedData.buildCommand);

        return res.json({ status: 'queued', data: { deploymentId: newDeployment.id, domain: newDeployment.url } })

    }
    catch (e) {
        return res.status(500).send({
            success: false,
            message: 'internal service error for building deployment',
            error: e.message
        });
    }
});
//get single project using projectId
// Example with Express.js
app.get("/api/project/:id", async (req, res) => {
    const { id } = req.params;
    // console.log("arrived id", id);
    try {
        const project = await prisma.project.findUnique({
            where: { id: id },
        });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.json(project);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch project', 'msg': error.message });
    }
});

//stopped temprorily 
// logsConsumer(); //this will display logs that are received by consumer and going to store in clickhouse

//for getting logs using deployment id
app.get('/getLogs/:id', async function (req, res) {
    try {
        const id = req.params.id;

        // Query ClickHouse for logs based on deployment_id
        const logs = await clickHouseClient.query({
            query: `SELECT event_id, deployment_id, log_message, log_level, file_name, file_size, file_size_in_bytes, time_taken, timestamp  
                    FROM deployment_logs
                    WHERE deployment_id = {deployment_id:String}`,
            query_params: {
                deployment_id: id
            },
            format: 'JSONEachRow'
        });

        const rawLogs = await logs.json();

        return res.json({ success: true, logs: rawLogs });

    } catch (e) {
        res.status(500).json({
            success: false,
            message: 'Internal error',
            error: e.message
        });
    }
});
//main test for checking pg connection
main();

//starting worker threads

//start worker thread here to hit  our woorker in acitive mode
startWorkerThreads();

//start server
app.listen(PORT, () => console.log(`API Server Running..${PORT}`));

//exporting app
module.exports = app;  // Export the app for testing purposes
