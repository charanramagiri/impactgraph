const express = require('express');
const incidentController = require('../controllers/incident.controller');

const router = express.Router();

router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncident);

module.exports = router;
