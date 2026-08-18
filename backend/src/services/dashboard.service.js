const dashboardRepository = require('../repositories/dashboard.repository');

async function getDashboard() {
  return dashboardRepository.getDashboardCounts();
}

module.exports = { getDashboard };
