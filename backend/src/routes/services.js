const express = require('express');
const serviceController = require('../controllers/service.controller');

const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (!/^[a-z0-9-]+$/.test(id)) {
    res.status(400).json({ error: 'Invalid service ID.' });
    return;
  }

  next();
});

router.get('/', serviceController.getServices);
router.get('/:id/impact', serviceController.getServiceImpact);
router.get('/:id', serviceController.getService);

module.exports = router;
