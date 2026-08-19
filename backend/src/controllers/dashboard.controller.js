const dashboardService = require('../services/dashboard.service');
const { handleControllerError } = require('../utils/httpErrors');

async function getDashboard(req, res) {
  try {
    const dashboard = await dashboardService.getDashboard();
    res.status(200).json(dashboard);
  } catch (error) {
    handleControllerError(error, 'Dashboard query', res);
  }
}

module.exports = { getDashboard };
