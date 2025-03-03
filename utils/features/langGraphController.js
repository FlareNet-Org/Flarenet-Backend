const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph");
const { createAgent, llm, memory } = require("../langchainConfig");
const { HumanMessage } = require("@langchain/core/messages");
const axios = require("axios");
const { prisma } = require('../prismaClient');

const processMessage = async (state) => {
  try {
    const parsedState = JSON.parse(JSON.stringify(state));

    const messageWithParams = parsedState.messages.find(
      (msg) => msg.kwargs?.params?.gitUrl && msg.kwargs?.params?.ownerId
    );

    if (!messageWithParams) {
      throw new Error("Missing required parameters (gitUrl, ownerId).");
    }

    const gitUrl = messageWithParams.kwargs.params.gitUrl;
    const ownerId = messageWithParams.kwargs.params.ownerId;
    const name = messageWithParams.kwargs.params.name || "Untitled Project";
    const description = messageWithParams.kwargs.params.description || "No description provided";

    console.log("Extracted gitUrl:", gitUrl);
    console.log("Extracted ownerId:", ownerId);
    console.log("Extracted Project Name:", name);
    console.log("Extracted Description:", description);

    // ✅ Create project in Prisma
    const createdProject = await prisma.project.create({
      data: { name, gitUrl, description, ownerId },
    });

    const projectId = createdProject.id;
    console.log("✅ Project successfully created with ID:", projectId);

    // ✅ Update state correctly
    // ✅ Ensure projectId and other details are included in state
    return {
      ...state,  // Preserve existing state
      projectId, // Pass projectId
      messages: [
        ...state.messages,
        { role: "system", content: `Project created successfully! ID: ${projectId}` },
        { role: "metadata", content: JSON.stringify({ projectId, gitUrl, ownerId, name, description }) } // ✅ Store metadata
      ]
    };
  } catch (error) {
    console.error("❌ Process error:", error.message);
    return { messages: [...state.messages, { role: "system", content: `Error: ${error.message}` }] };
  }
};

const markDeployment = async (state) => {
  console.log("inside function markdeployment");
  // console.log("DEBUG: markDeployment received state:", JSON.stringify(state, null, 2));

  // ✅ Extract metadata from messages
  const metadataMessage = state.messages.find(msg => msg.role === "metadata");
  if (!metadataMessage) {
    throw new Error("Metadata message not found in state!");
  }

  const metadata = JSON.parse(metadataMessage.content);
  const projectId = metadata.projectId;

  console.log("Extracted Project ID:", projectId);

  if (!projectId) {
    console.error("❌ markDeployment: Project ID is missing from metadata!");
    throw new Error("Project ID not found in state");
  }

  // ✅ Create deployment marker
  const deployment = await prisma.deployment.create({
    data: { projectId }
  });

  console.log("✅ Deployment created with ID:", deployment.id);
};



// ✅ Simplified workflow setup
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("processMessage", processMessage)
  .addNode("markDeployment", markDeployment)
  .addEdge("processMessage", "markDeployment")
  .addEdge("__start__", "processMessage");

const app = workflow.compile();


// Modify runDeploymentWorkflow function
// Modified runDeploymentWorkflow function
const runDeploymentWorkflow = async (user, params) => {
  // console.log("Running with params:", params);

  // Create initial state
  const initialState = {
    params: params,
    user: user,
    deployment_status: "started",
    messages: [],
    projectId: null,
    gitUri: null,
    error: null
  };

  console.log("Initial State:", JSON.stringify(initialState, null, 2));

  // Wrap initialState inside `messages`
  return await app.invoke({ messages: [new HumanMessage(initialState)] });
};


module.exports = { runDeploymentWorkflow };
