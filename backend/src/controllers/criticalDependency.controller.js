const criticalDependencyService = require('../services/criticalDependency.service');

async function getCriticalDependencies(req, res) {
  try {
    const dependencies =
      await criticalDependencyService.listCriticalDependencies();
    res.status(200).json({ dependencies });
  } catch (error) {
    const errorCode =
      typeof error.code === 'string' ? ` (code: ${error.code})` : '';
    console.error(`Critical dependency query failed${errorCode}.`);

    res.status(503).json({
      status: 'error',
      message: 'Graph database is currently unavailable.',
    });
  }
}

module.exports = { getCriticalDependencies };
