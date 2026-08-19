const neo4j = require('neo4j-driver');
const { driver } = require('../config/database');

const DATASET = 'impactgraph';

function toNumber(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

function toDateTimeString(value) {
  if (value == null || typeof value === 'string') {
    return value;
  }

  return value.toString();
}

function mapIncident(record) {
  return {
    id: record.get('id'),
    title: record.get('title'),
    severity: record.get('severity'),
    status: record.get('status'),
    startedAt: toDateTimeString(record.get('startedAt')),
    resolvedAt: toDateTimeString(record.get('resolvedAt')),
    description: record.get('description'),
  };
}

async function getIncidents() {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const result = await session.run(
      `MATCH (incident:Incident {dataset: $dataset})
       OPTIONAL MATCH (incident)-[:AFFECTS]->
                      (service:Service {dataset: $dataset})
       WITH incident, service
       ORDER BY toLower(service.name), service.id
       WITH incident,
            collect(service { .id, .name }) AS affectedServices
       RETURN incident.id AS id,
              incident.title AS title,
              incident.severity AS severity,
              incident.status AS status,
              incident.startedAt AS startedAt,
              incident.resolvedAt AS resolvedAt,
              incident.description AS description,
              affectedServices
       ORDER BY startedAt DESC, id`,
      { dataset: DATASET }
    );

    return result.records.map((record) => {
      const affectedServices = record.get('affectedServices').map((service) => ({
        id: service.id,
        name: service.name,
      }));

      return {
        ...mapIncident(record),
        affectedServiceCount: affectedServices.length,
        affectedServices,
      };
    });
  } finally {
    await session.close();
  }
}

async function getIncidentById(incidentId) {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    return await session.executeRead(async (transaction) => {
      const incidentResult = await transaction.run(
        `MATCH (incident:Incident {id: $incidentId, dataset: $dataset})
         RETURN incident.id AS id,
                incident.title AS title,
                incident.severity AS severity,
                incident.status AS status,
                incident.startedAt AS startedAt,
                incident.resolvedAt AS resolvedAt,
                incident.description AS description`,
        { dataset: DATASET, incidentId }
      );

      if (incidentResult.records.length === 0) {
        return null;
      }

      const directlyAffectedResult = await transaction.run(
        `MATCH (:Incident {id: $incidentId, dataset: $dataset})
               -[:AFFECTS]->(service:Service {dataset: $dataset})
         RETURN service.id AS id,
                service.name AS name,
                service.status AS status,
                service.criticality AS criticality
         ORDER BY toLower(service.name), service.id`,
        { dataset: DATASET, incidentId }
      );
      const affectedResult = await transaction.run(
        `MATCH (:Incident {id: $incidentId, dataset: $dataset})
               -[:AFFECTS]->(directRoot:Service {dataset: $dataset})
         WITH collect(directRoot.id) AS rootIds
         MATCH path =
               (root:Service {dataset: $dataset})
               <-[:DEPENDS_ON*1..6]-(affected:Service {dataset: $dataset})
         WHERE root.id IN rootIds
           AND NOT affected.id IN rootIds
           AND all(pathNode IN nodes(path)
                   WHERE pathNode:Service AND pathNode.dataset = $dataset)
         WITH affected, min(length(path)) AS depth
         RETURN affected.id AS id,
                affected.name AS name,
                affected.status AS status,
                affected.criticality AS criticality,
                depth
         ORDER BY depth, toLower(affected.name), affected.id`,
        { dataset: DATASET, incidentId }
      );
      const pathResult = await transaction.run(
        `MATCH (:Incident {id: $incidentId, dataset: $dataset})
               -[:AFFECTS]->(directRoot:Service {dataset: $dataset})
         WITH collect(directRoot.id) AS rootIds
         MATCH path =
               (root:Service {dataset: $dataset})
               <-[:DEPENDS_ON*1..6]-(affected:Service {dataset: $dataset})
         WHERE root.id IN rootIds
           AND NOT affected.id IN rootIds
           AND all(pathNode IN nodes(path)
                   WHERE pathNode:Service AND pathNode.dataset = $dataset)
         WITH root, nodes(path) AS servicePathNodes
         WITH DISTINCT root.id AS rootServiceId,
              [pathNode IN servicePathNodes | pathNode.id] AS pathIds,
              [pathNode IN servicePathNodes |
                {id: pathNode.id, name: pathNode.name}] AS projectedNodes
         RETURN rootServiceId,
                projectedNodes AS nodes,
                size(pathIds) - 1 AS depth,
                reduce(pathKey = '', nodeId IN pathIds |
                       pathKey + '|' + nodeId) AS pathKey
         ORDER BY depth, rootServiceId, pathKey`,
        { dataset: DATASET, incidentId }
      );

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

      return {
        incident: mapIncident(incidentResult.records[0]),
        directlyAffected: directlyAffectedResult.records.map((record) => ({
          id: record.get('id'),
          name: record.get('name'),
          status: record.get('status'),
          criticality: record.get('criticality'),
        })),
        impact: {
          affectedServices: affected.length,
          criticalServices,
          maxDepth: affected.reduce(
            (maximum, service) => Math.max(maximum, service.depth),
            0
          ),
        },
        affected,
        paths: pathResult.records.map((record) => ({
          rootServiceId: record.get('rootServiceId'),
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

module.exports = { getIncidents, getIncidentById };
