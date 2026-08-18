const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';

async function getServices() {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const result = await session.run(
      `MATCH (service:Service {dataset: $dataset})
       RETURN service.id AS id,
              service.name AS name,
              service.description AS description,
              service.status AS status,
              service.criticality AS criticality
       ORDER BY toLower(service.name), service.id`,
      { dataset: DATASET }
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      status: record.get('status'),
      criticality: record.get('criticality'),
    }));
  } finally {
    await session.close();
  }
}

module.exports = { getServices };
