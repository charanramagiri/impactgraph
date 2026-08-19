const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';
const DEPENDENCY_TYPES = ['DEPENDS_ON', 'USES', 'CALLS'];

function toNumber(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

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

async function getServiceImpact(serviceId) {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    return await session.executeRead(async (transaction) => {
      const serviceResult = await transaction.run(
        `MATCH (service:Service {id: $serviceId, dataset: $dataset})
         RETURN service.id AS id,
                service.name AS name,
                service.status AS status,
                service.criticality AS criticality`,
        { dataset: DATASET, serviceId }
      );

      if (serviceResult.records.length === 0) {
        return null;
      }

      const affectedResult = await transaction.run(
        `MATCH path =
               (:Service {id: $serviceId, dataset: $dataset})
               <-[:DEPENDS_ON*1..6]-(affected:Service {dataset: $dataset})
         WHERE all(pathNode IN nodes(path)
                   WHERE pathNode:Service AND pathNode.dataset = $dataset)
         WITH affected, min(length(path)) AS depth
         RETURN affected.id AS id,
                affected.name AS name,
                affected.status AS status,
                affected.criticality AS criticality,
                depth
         ORDER BY depth, toLower(affected.name), affected.id`,
        { dataset: DATASET, serviceId }
      );
      const pathResult = await transaction.run(
        `MATCH path =
               (:Service {id: $serviceId, dataset: $dataset})
               <-[:DEPENDS_ON*1..6]-(:Service {dataset: $dataset})
         WHERE all(pathNode IN nodes(path)
                   WHERE pathNode:Service AND pathNode.dataset = $dataset)
         WITH nodes(path) AS pathNodes
         WITH DISTINCT
              [pathNode IN pathNodes | pathNode.id] AS pathIds,
              [pathNode IN pathNodes |
                {id: pathNode.id, name: pathNode.name}] AS projectedNodes
         RETURN projectedNodes AS nodes,
                size(pathIds) - 1 AS depth,
                reduce(pathKey = '', nodeId IN pathIds |
                       pathKey + '|' + nodeId) AS pathKey
         ORDER BY depth, pathKey`,
        { dataset: DATASET, serviceId }
      );

      const serviceRecord = serviceResult.records[0];
      const affected = affectedResult.records.map((record) => ({
        id: record.get('id'),
        name: record.get('name'),
        status: record.get('status'),
        criticality: record.get('criticality'),
        depth: toNumber(record.get('depth')),
      }));
      const criticalServices = affected.filter(
        (service) =>
          service.criticality === 'high' || service.criticality === 'critical'
      ).length;
      const maxDepth = affected.reduce(
        (maximum, service) => Math.max(maximum, service.depth),
        0
      );

      return {
        service: {
          id: serviceRecord.get('id'),
          name: serviceRecord.get('name'),
          status: serviceRecord.get('status'),
          criticality: serviceRecord.get('criticality'),
        },
        summary: {
          affectedServices: affected.length,
          criticalServices,
          maxDepth,
        },
        affected,
        paths: pathResult.records.map((record) => ({
          nodes: record.get('nodes').map((node) => ({
            id: node.id,
            name: node.name,
          })),
        })),
      };
    });
  } finally {
    await session.close();
  }
}

module.exports = { getServices, getServiceById, getServiceImpact };
