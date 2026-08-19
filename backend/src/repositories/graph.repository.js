const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';
const RELATIONSHIP_TYPES = ['DEPENDS_ON', 'USES', 'CALLS', 'OWNS'];

function mapNode(record) {
  const type = record.get('type');
  const commonFields = {
    id: record.get('id'),
    type,
    name: record.get('name'),
  };

  if (type === 'Service') {
    return {
      ...commonFields,
      description: record.get('description'),
      status: record.get('status'),
      criticality: record.get('criticality'),
    };
  }

  if (type === 'Database') {
    return {
      ...commonFields,
      engine: record.get('engine'),
      status: record.get('status'),
      criticality: record.get('criticality'),
    };
  }

  if (type === 'ExternalAPI') {
    return {
      ...commonFields,
      provider: record.get('provider'),
      status: record.get('status'),
    };
  }

  return {
    ...commonFields,
    email: record.get('email'),
  };
}

function mapEdge(record) {
  const source = record.get('source');
  const target = record.get('target');
  const type = record.get('type');

  return {
    id: `${source}-${type}-${target}`,
    source,
    target,
    type,
  };
}

async function getGraph() {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    return await session.executeRead(async (transaction) => {
      const nodeResult = await transaction.run(
        `MATCH (node {dataset: $dataset})
         WHERE node:Service OR node:Database OR node:ExternalAPI OR node:Team
         WITH node,
              CASE
                WHEN node:Service THEN 'Service'
                WHEN node:Database THEN 'Database'
                WHEN node:ExternalAPI THEN 'ExternalAPI'
                WHEN node:Team THEN 'Team'
              END AS type
         RETURN node.id AS id,
                type,
                node.name AS name,
                node.description AS description,
                node.status AS status,
                node.criticality AS criticality,
                node.engine AS engine,
                node.provider AS provider,
                node.email AS email
         ORDER BY type, toLower(node.name), node.id`,
        { dataset: DATASET }
      );
      const edgeResult = await transaction.run(
        `MATCH (source {dataset: $dataset})-[relationship]->(target {dataset: $dataset})
         WHERE type(relationship) IN $relationshipTypes
         RETURN source.id AS source,
                target.id AS target,
                type(relationship) AS type
         ORDER BY type, source, target`,
        {
          dataset: DATASET,
          relationshipTypes: RELATIONSHIP_TYPES,
        }
      );

      return {
        nodes: nodeResult.records.map(mapNode),
        edges: edgeResult.records.map(mapEdge),
      };
    });
  } finally {
    await session.close();
  }
}

module.exports = { getGraph };
