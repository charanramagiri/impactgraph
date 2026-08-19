const graphService = require('../services/graph.service');

async function getGraph(req, res) {
  try {
    const graph = await graphService.getGraph();
    res.status(200).json(graph);
  } catch (error) {
    const errorCode =
      typeof error.code === 'string' ? ` (code: ${error.code})` : '';
    console.error(`Graph query failed${errorCode}.`);

    res.status(503).json({
      status: 'error',
      message: 'Graph database is currently unavailable.',
    });
  }
}

module.exports = { getGraph };
