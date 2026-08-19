const incidentService = require('../services/incident.service');

function sendDatabaseUnavailable(error, context, res) {
  const errorCode =
    typeof error.code === 'string' ? ` (code: ${error.code})` : '';
  console.error(`${context} failed${errorCode}.`);

  res.status(503).json({
    status: 'error',
    message: 'Graph database is currently unavailable.',
  });
}

async function getIncidents(req, res) {
  try {
    const incidents = await incidentService.listIncidents();
    res.status(200).json({ incidents });
  } catch (error) {
    sendDatabaseUnavailable(error, 'Incident list query', res);
  }
}

async function getIncident(req, res) {
  try {
    const incident = await incidentService.getIncident(req.params.id);

    if (!incident) {
      res.status(404).json({ error: 'Incident not found.' });
      return;
    }

    res.status(200).json(incident);
  } catch (error) {
    sendDatabaseUnavailable(error, 'Incident detail query', res);
  }
}

module.exports = { getIncidents, getIncident };
