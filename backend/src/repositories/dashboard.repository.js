const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';

function toNumber(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

async function getDashboardCounts() {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const result = await session.run(
      `MATCH (node {dataset: $dataset})
       RETURN count(CASE WHEN node:Service THEN 1 END) AS services,
              count(CASE WHEN node:Database THEN 1 END) AS databases,
              count(CASE WHEN node:ExternalAPI THEN 1 END) AS externalApis,
              count(CASE WHEN node:Team THEN 1 END) AS teams,
              count(CASE WHEN node:Incident THEN 1 END) AS incidents`,
      { dataset: DATASET }
    );
    const record = result.records[0];

    return {
      services: toNumber(record.get('services')),
      databases: toNumber(record.get('databases')),
      externalApis: toNumber(record.get('externalApis')),
      teams: toNumber(record.get('teams')),
      incidents: toNumber(record.get('incidents')),
    };
  } finally {
    await session.close();
  }
}

module.exports = { getDashboardCounts };
