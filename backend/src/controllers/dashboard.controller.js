const dashboardService = require('../services/dashboard.service');

async function getDashboard(req, res) {
  try {
    const dashboard = await dashboardService.getDashboard();
    res.status(200).json(dashboard);
  } catch (error) {
    const errorCode =
      typeof error.code === 'string' ? ` (code: ${error.code})` : '';
    console.error(`Dashboard query failed${errorCode}.`);

    res.status(503).json({
      status: 'error',
      message: 'Graph database is currently unavailable.',
    });
  }
}

module.exports = { getDashboard };
