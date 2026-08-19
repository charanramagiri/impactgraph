const incidentRepository = require('../repositories/incident.repository');

async function listIncidents() {
  return incidentRepository.getIncidents();
}

async function getIncident(incidentId) {
  return incidentRepository.getIncidentById(incidentId);
}

module.exports = { listIncidents, getIncident };
