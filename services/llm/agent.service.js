const { tool } = require("@langchain/core/tools");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { createOpenAIFunctionsAgent, AgentExecutor } = require("langchain/agents");
const { deploymentTool } = require("../chat/tools/deployment.tool");

let agentExecutor; // Store agentExecutor for reuse
const createAdvancedAgent = async (llm, memory) => {
    if (!llm || !memory) {
        throw new Error("LLM or Memory is not properly initialized.");
    }

    const tools = [
        deploymentTool,
        // Add other tools here
    ];

    // Updated prompt setup
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an advanced deployment assistant...`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
    
    const agent = await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt,
    });

    // Create agent using the new OpenAI function-based approach
    agentExecutor = new AgentExecutor({
        agent,
        tools,
        memory,
        returnIntermediateSteps: true,
    });

    return agentExecutor;
};

module.exports = { createAdvancedAgent };
