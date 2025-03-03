const { Kafka } = require('kafkajs');

// Initialize Kafka instance
const kafka = new Kafka({
    clientId: 'deployment-service', // Unique name for your app
    brokers: ['localhost:9092'], // The address of your Kafka broker(s)
});

// Create a Kafka producer
const producer = kafka.producer();

async function sendEvent(topic, message) {
    try {
        await producer.connect();
        console.log(`Sending message to topic ${topic}...`);
        await producer.send({
            topic,
            messages: [
                { value: JSON.stringify(message) }
            ],
        });
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error sending message:', error.message);
    } finally {
        await producer.disconnect();
    }
}

module.exports = {
    sendEvent
};
