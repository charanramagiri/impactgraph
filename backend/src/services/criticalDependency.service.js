const criticalDependencyRepository = require('../repositories/criticalDependency.repository');

async function listCriticalDependencies() {
  return criticalDependencyRepository.getCriticalDependencies();
}

module.exports = { listCriticalDependencies };
