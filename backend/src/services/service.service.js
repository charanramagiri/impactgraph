const serviceRepository = require('../repositories/service.repository');

async function listServices() {
  return serviceRepository.getServices();
}

async function getService(serviceId) {
  return serviceRepository.getServiceById(serviceId);
}

module.exports = { listServices, getService };
