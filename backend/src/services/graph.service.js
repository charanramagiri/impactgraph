const graphRepository = require('../repositories/graph.repository');

async function getGraph() {
  return graphRepository.getGraph();
}

module.exports = { getGraph };
