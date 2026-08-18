const serviceService = require('../services/service.service');

async function getServices(req, res) {
  try {
    const services = await serviceService.listServices();
    res.status(200).json({ services });
  } catch (error) {
    const errorCode =
      typeof error.code === 'string' ? ` (code: ${error.code})` : '';
    console.error(`Service list query failed${errorCode}.`);

    res.status(503).json({
      status: 'error',
      message: 'Graph database is currently unavailable.',
    });
  }
}

module.exports = { getServices };
