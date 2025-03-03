const express = require('express');
const { webHookOctoKitHelper } = require('../auth/createWebHook');

const { githubRedirect,
    exchangeCodeForToken,
    saveAccessToken,githubCallback,getUserInfo,listRepositories } = require('../auth/githubAuth');
const {handlePushEvent}=require('../auth/webEventHandelers');
// const { App } = require('octokit');

const router = express.Router();

router.get('/auth-url', githubRedirect);
router.post('/token', githubCallback);
// router.post('/save-token', saveAccessToken);

//get user information
router.get('/user-info', getUserInfo); //working tested using query param only nnot for body
router.get('/user-repos',listRepositories); //working tested using query param only nnot for body

//routers for creating webhooks
router.post('/create-webhook', webHookOctoKitHelper);


//web hook route
router.post('/webhook-notifier',handlePushEvent);
module.exports = router;