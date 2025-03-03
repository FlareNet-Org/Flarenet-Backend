const express = require('express');
const { validateReactProject } = require('../auth/deploymentAuth');
;

const router = express.Router();

router.get('/validate-react', validateReactProject);

module.exports = router;