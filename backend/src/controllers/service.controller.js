const serviceService = require('../services/service.service');
const { handleControllerError } = require('../utils/httpErrors');

async function getServices(req, res) {
  try {
    const services = await serviceService.listServices();
    res.status(200).json({ services });
  } catch (error) {
    handleControllerError(error, 'Service list query', res);
  }
}

async function getService(req, res) {
  try {
    const service = await serviceService.getService(req.params.id);

    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    res.status(200).json(service);
  } catch (error) {
    handleControllerError(error, 'Service detail query', res);
  }
}

async function getServiceImpact(req, res) {
  try {
    const impact = await serviceService.getServiceImpact(req.params.id);

    if (!impact) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    res.status(200).json(impact);
  } catch (error) {
    handleControllerError(error, 'Service impact query', res);
  }
}

module.exports = { getServices, getService, getServiceImpact };
