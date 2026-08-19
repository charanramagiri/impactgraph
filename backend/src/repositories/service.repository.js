const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';
const DEPENDENCY_TYPES = ['DEPENDS_ON', 'USES', 'CALLS'];

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

async function getServiceById(serviceId) {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    return await session.executeRead(async (transaction) => {
      const serviceResult = await transaction.run(
        `MATCH (service:Service {id: $serviceId, dataset: $dataset})
         OPTIONAL MATCH (owner:Team {dataset: $dataset})-[:OWNS]->(service)
         RETURN service.id AS id,
                service.name AS name,
                service.description AS description,
                service.status AS status,
                service.criticality AS criticality,
                owner.id AS ownerId,
                owner.name AS ownerName,
                owner.email AS ownerEmail
         LIMIT 1`,
        { dataset: DATASET, serviceId }
      );

      if (serviceResult.records.length === 0) {
        return null;
      }

      const dependencyResult = await transaction.run(
        `MATCH (:Service {id: $serviceId, dataset: $dataset})
               -[relationship]->(dependency {dataset: $dataset})
         WHERE type(relationship) IN $dependencyTypes
         WITH dependency,
              type(relationship) AS relationship,
              CASE
                WHEN dependency:Service THEN 'Service'
                WHEN dependency:Database THEN 'Database'
                WHEN dependency:ExternalAPI THEN 'ExternalAPI'
              END AS nodeType
         RETURN relationship,
                dependency.id AS id,
                nodeType AS type,
                dependency.name AS name
         ORDER BY relationship, toLower(dependency.name), dependency.id`,
        {
          dataset: DATASET,
          serviceId,
          dependencyTypes: DEPENDENCY_TYPES,
        }
      );
      const dependentResult = await transaction.run(
        `MATCH (dependent:Service {dataset: $dataset})
               -[:DEPENDS_ON]->(:Service {id: $serviceId, dataset: $dataset})
         RETURN 'DEPENDS_ON' AS relationship,
                dependent.id AS id,
                'Service' AS type,
                dependent.name AS name
         ORDER BY toLower(dependent.name), dependent.id`,
        { dataset: DATASET, serviceId }
      );

      const serviceRecord = serviceResult.records[0];
      const ownerId = serviceRecord.get('ownerId');
      const mapRelatedNode = (record) => ({
        relationship: record.get('relationship'),
        node: {
          id: record.get('id'),
          type: record.get('type'),
          name: record.get('name'),
        },
      });

      return {
        service: {
          id: serviceRecord.get('id'),
          name: serviceRecord.get('name'),
          description: serviceRecord.get('description'),
          status: serviceRecord.get('status'),
          criticality: serviceRecord.get('criticality'),
        },
        owner: ownerId
          ? {
              id: ownerId,
              name: serviceRecord.get('ownerName'),
              email: serviceRecord.get('ownerEmail'),
            }
          : null,
        dependencies: dependencyResult.records.map(mapRelatedNode),
        dependents: dependentResult.records.map(mapRelatedNode),
      };
    });
  } finally {
    await session.close();
  }
}

module.exports = { getServices, getServiceById };
