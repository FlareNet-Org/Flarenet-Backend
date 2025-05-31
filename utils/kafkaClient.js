const { Kafka } = require('kafkajs');
require('dotenv').config({ path: '../.env.development' });
const kafka = new Kafka({
    clientId: `api-server-receiver_side`,
    brokers: [`${process.env.KAFKA_BROKER}`],
});
console.log(process.env.KAFKA_BROKER);

module.exports = kafka;