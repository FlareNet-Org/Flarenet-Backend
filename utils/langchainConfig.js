const path=require('path');
require('dotenv').config({path:path.resolve(__dirname,'../.env.development')});
const { ChatGroq } = require("@langchain/groq");
const { createAdvancedAgent } = require("../services/llm/agent.service");
const { BufferMemory } = require("langchain/memory");// Import MemorySaver

console.log(process.env.GROQ_API_KEY);
//llm configuration
const llm = new ChatGroq({
    model: "mistral-saba-24b",
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




