const express = require('express');
const incidentController = require('../controllers/incident.controller');

const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (!/^[a-z0-9-]+$/.test(id)) {
    res.status(400).json({ error: 'Invalid incident ID.' });
    return;
  }

  next();
});

router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncident);

module.exports = router;
