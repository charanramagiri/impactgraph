const graphService = require('../services/graph.service');
const { handleControllerError } = require('../utils/httpErrors');

async function getGraph(req, res) {
  try {
    const graph = await graphService.getGraph();
    res.status(200).json(graph);
  } catch (error) {
    handleControllerError(error, 'Graph query', res);
  }
}

module.exports = { getGraph };
