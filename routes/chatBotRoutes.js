const express = require("express");
const { chatbotController } = require("../utils/features/chatBotController");
const router = express.Router();

router.post("/chat", chatbotController);

module.exports = router;