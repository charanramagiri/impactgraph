const incidentService = require('../services/incident.service');
const { handleControllerError } = require('../utils/httpErrors');

async function getIncidents(req, res) {
  try {
    const incidents = await incidentService.listIncidents();
    res.status(200).json({ incidents });
  } catch (error) {
    handleControllerError(error, 'Incident list query', res);
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
    handleControllerError(error, 'Incident detail query', res);
  }
}

module.exports = { getIncidents, getIncident };
