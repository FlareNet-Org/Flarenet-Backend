const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: `api-server-receiver_side`,
    brokers: [`${process.env.KAFKA_BROKER}`],
});

module.exports = kafka;