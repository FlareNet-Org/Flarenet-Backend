const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function validateWebhook(headers, body) {
    const signature = headers['x-hub-signature'];
    if (!signature) {
        return false;
    }

    const [algo, hash] = signature.split('=');
    const computedHash = crypto
        .createHmac(algorithm, WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

    return computedHash === hash;
}
module.exports = validateWebhook;