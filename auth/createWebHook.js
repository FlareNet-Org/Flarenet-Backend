const axios = require('axios');
require('dotenv').config({ path: '../.env' });
// Using dynamic import for ESM module
let Octokit;

async function createWebhookOcta(oauthToken, owner, repo) {
    // Dynamically import Octokit
    const { Octokit: OctokitModule } = await import('@octokit/core');
    Octokit = OctokitModule;

    //create octokit instance using users oAuth  token
    const octokit = new Octokit({ auth: oauthToken });
    try {
        const response = await octokit.request('POST /repos/{owner}/{repo}/hooks', {
            owner: owner,//reppo owner whose account is being used after auth
            repo: repo, //repoName on which webhook will be created
            name: 'web',
            active: true,
            events: ['push', 'pull_request'], // Add other events as needed
            config: {
                url: 'https://fde7-103-252-53-110.ngrok-free.app/api/github/webhook-notifier', // Replace with your server URL
                content_type: 'json',
                insecure_ssl: '0'
            },
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        // console.log('Webhook created successfully:', response.data);
    } catch (error) {
        console.error('Error creating webhook:', error);
    }
}

//   createWebhookOcta(); single call is made already

//helper methods
async function webHookOctoKitHelper(req, res) {
    const { oauthToken, owner, repo } = req.body;

    if (!oauthToken || !owner || !repo) {
        return res.status(400).json({ message: 'Missing required parameters: oauthToken, owner, or repo' });
    }
    try {
        const webhook = await createWebhookOcta(oauthToken, owner, repo);
        res.status(200).json({
            message: 'Webhook created successfully',
            webhook
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error creating webhook',
            error: error.message
        });
    }
}

module.exports = { webHookOctoKitHelper };
