const express = require('express');
const { verifyConnectivity } = require('../config/database');

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
    const errorCode =
      typeof error.code === 'string' ? ` (code: ${error.code})` : '';
    console.error(`CognoDB health check failed${errorCode}.`);

    res.status(503).json({
      status: 'error',
      database: 'unavailable',
      message: 'Graph database is currently unavailable.',
    });
  }
});

module.exports = router;
