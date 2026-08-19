const express = require('express');
const criticalDependencyController = require('../controllers/criticalDependency.controller');

const router = express.Router();

router.get('/', criticalDependencyController.getCriticalDependencies);

module.exports = router;
