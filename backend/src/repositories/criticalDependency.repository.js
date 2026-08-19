const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';

function toNumber(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

async function getCriticalDependencies() {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const result = await session.run(
      `MATCH (service:Service {dataset: $dataset})
       OPTIONAL MATCH path =
         (service)<-[:DEPENDS_ON*1..6]-(affected:Service {dataset: $dataset})
       WHERE path IS NULL OR
             all(pathNode IN nodes(path)
                 WHERE pathNode:Service AND pathNode.dataset = $dataset)
       WITH service, affected, min(length(path)) AS minimumDepth
       WITH service,
            count(affected) AS dependentServices,
            coalesce(max(minimumDepth), 0) AS maxDepth
       RETURN service.id AS id,
              service.name AS name,
              service.status AS status,
              service.criticality AS criticality,
              dependentServices,
              maxDepth
       ORDER BY dependentServices DESC,
                maxDepth DESC,
                toLower(service.name),
                service.id`,
      { dataset: DATASET }
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      name: record.get('name'),
      status: record.get('status'),
      criticality: record.get('criticality'),
      dependentServices: toNumber(record.get('dependentServices')),
      maxDepth: toNumber(record.get('maxDepth')),
    }));
  } finally {
    await session.close();
  }
}

module.exports = { getCriticalDependencies };
