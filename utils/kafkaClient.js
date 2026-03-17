const { Kafka } = require('kafkajs');

// Environment variables are loaded by index.js
const kafka = new Kafka({
    clientId: `api-server-receiver_side`,
    brokers: [`${process.env.KAFKA_BROKER}`],
});
console.log(process.env.KAFKA_BROKER);

module.exports = kafka;