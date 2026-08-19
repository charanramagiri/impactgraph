const serviceRepository = require('../repositories/service.repository');

async function listServices() {
  return serviceRepository.getServices();
}

async function getService(serviceId) {
  return serviceRepository.getServiceById(serviceId);
}

async function getServiceImpact(serviceId) {
  return serviceRepository.getServiceImpact(serviceId);
}

module.exports = { listServices, getService, getServiceImpact };
