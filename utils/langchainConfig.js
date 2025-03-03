require('dotenv').config({ path: '../.env' });
const { ChatGroq } = require("@langchain/groq");
const { createAdvancedAgent } = require("../services/llm/agent.service");
const { BufferMemory } = require("langchain/memory");// Import MemorySaver

console.log(process.env.GROQ_API_KEY);
//llm configuration
const llm = new ChatGroq({
    model: "mixtral-8x7b-32768",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.3
});
// Memory Configuration
const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
    inputKey: "input",
    outputKey: "output",
});


module.exports = {
    llm,
    memory,
    createAgent:createAdvancedAgent
};




