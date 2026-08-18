const serviceRepository = require('../repositories/service.repository');

async function listServices() {
  return serviceRepository.getServices();
}

module.exports = { listServices };
