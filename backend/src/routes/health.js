const express = require('express');
const { verifyConnectivity } = require('../config/database');
const { sendDatabaseUnavailable } = require('../utils/httpErrors');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const isConnected = await verifyConnectivity();

    if (!isConnected) {
      throw new Error('Unexpected connectivity query result');
    }

    res.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    sendDatabaseUnavailable(error, 'CognoDB health check', res);
  }
});

module.exports = router;
