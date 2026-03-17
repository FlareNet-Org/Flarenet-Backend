// Environment variables are loaded by index.js
const { createAdvancedAgent } = require("../services/llm/agent.service");

let llm = null;
let memory = null;

// Only initialize LLM if GROQ_API_KEY is available
if (process.env.GROQ_API_KEY) {
    const { ChatGroq } = require("@langchain/groq");
    const { BufferMemory } = require("langchain/memory");
    
    console.log('GROQ_API_KEY found, initializing LLM...');
    
    llm = new ChatGroq({
        model: "qwen/qwen3-32b",
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.3
    });
    
    memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "chat_history",
        inputKey: "input",
        outputKey: "output",
    });
} else {
    console.warn('GROQ_API_KEY not found - LLM features disabled');
}

module.exports = {
    llm,
    memory,
    createAgent: createAdvancedAgent
};




