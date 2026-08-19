const criticalDependencyService = require('../services/criticalDependency.service');
const { handleControllerError } = require('../utils/httpErrors');

async function getCriticalDependencies(req, res) {
  try {
    const dependencies =
      await criticalDependencyService.listCriticalDependencies();
    res.status(200).json({ dependencies });
  } catch (error) {
    handleControllerError(error, 'Critical dependency query', res);
  }
}

module.exports = { getCriticalDependencies };
