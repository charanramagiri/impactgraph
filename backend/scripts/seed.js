require('dotenv').config({ quiet: true });

const neo4j = require('neo4j-driver');
const { driver, closeDriver } = require('../src/config/database');

const DATASET = 'impactgraph';

const services = [
  { id: 'svc-storefront', name: 'Storefront Service', description: 'Customer-facing web storefront and product discovery entry point.', status: 'healthy', criticality: 'critical' },
  { id: 'svc-gateway', name: 'API Gateway', description: 'Routes and secures requests to internal commerce services.', status: 'healthy', criticality: 'critical' },
  { id: 'svc-auth', name: 'Authentication Service', description: 'Authenticates customers and manages access tokens.', status: 'unavailable', criticality: 'critical' },
  { id: 'svc-profile', name: 'User Profile Service', description: 'Manages customer profiles, preferences, and addresses.', status: 'healthy', criticality: 'high' },
  { id: 'svc-cart', name: 'Cart Service', description: 'Maintains active shopping carts and selected quantities.', status: 'healthy', criticality: 'high' },
  { id: 'svc-checkout', name: 'Checkout Service', description: 'Coordinates validation, payment, and order placement.', status: 'healthy', criticality: 'critical' },
  { id: 'svc-payment', name: 'Payment Service', description: 'Processes and tracks customer payment transactions.', status: 'degraded', criticality: 'critical' },
  { id: 'svc-fraud', name: 'Fraud Detection Service', description: 'Evaluates payment attempts for fraud risk.', status: 'healthy', criticality: 'high' },
  { id: 'svc-order', name: 'Order Service', description: 'Creates orders and manages their lifecycle.', status: 'healthy', criticality: 'critical' },
  { id: 'svc-inventory', name: 'Inventory Service', description: 'Tracks stock levels and inventory reservations.', status: 'degraded', criticality: 'critical' },
  { id: 'svc-pricing', name: 'Pricing Service', description: 'Calculates prices, discounts, and promotions.', status: 'healthy', criticality: 'high' },
  { id: 'svc-search', name: 'Search Service', description: 'Indexes and searches the product catalog.', status: 'degraded', criticality: 'high' },
  { id: 'svc-recommendation', name: 'Recommendation Service', description: 'Produces personalized product recommendations.', status: 'healthy', criticality: 'medium' },
  { id: 'svc-notification', name: 'Notification Service', description: 'Delivers transactional email and customer alerts.', status: 'degraded', criticality: 'high' },
  { id: 'svc-shipping', name: 'Shipping Service', description: 'Coordinates shipment creation and tracking.', status: 'healthy', criticality: 'high' },
  { id: 'svc-review', name: 'Review Service', description: 'Manages verified product ratings and reviews.', status: 'healthy', criticality: 'medium' },
  { id: 'svc-admin', name: 'Admin Service', description: 'Provides operational tools for commerce administrators.', status: 'healthy', criticality: 'high' },
  { id: 'svc-analytics', name: 'Analytics Service', description: 'Aggregates commerce events and operational metrics.', status: 'healthy', criticality: 'medium' },
];

const databases = [
  { id: 'db-users', name: 'Users DB', engine: 'PostgreSQL', status: 'healthy', criticality: 'critical' },
  { id: 'db-orders', name: 'Orders DB', engine: 'PostgreSQL', status: 'healthy', criticality: 'critical' },
  { id: 'db-inventory', name: 'Inventory DB', engine: 'MySQL', status: 'degraded', criticality: 'critical' },
  { id: 'db-analytics', name: 'Analytics DB', engine: 'ClickHouse', status: 'healthy', criticality: 'medium' },
];

const externalApis = [
  { id: 'api-stripe', name: 'Stripe API', provider: 'Stripe', status: 'healthy' },
  { id: 'api-sendgrid', name: 'SendGrid API', provider: 'Twilio SendGrid', status: 'degraded' },
  { id: 'api-shipping', name: 'Shipping Provider API', provider: 'Shippo', status: 'healthy' },
  { id: 'api-fraud', name: 'Fraud Detection API', provider: 'Sift', status: 'healthy' },
];

const teams = [
  { id: 'team-identity', name: 'Identity Team', email: 'identity@example.com' },
  { id: 'team-commerce', name: 'Commerce Team', email: 'commerce@example.com' },
  { id: 'team-payments', name: 'Payments Team', email: 'payments@example.com' },
  { id: 'team-platform', name: 'Platform Team', email: 'platform@example.com' },
  { id: 'team-data', name: 'Data Team', email: 'data@example.com' },
];

const incidents = [
  { id: 'inc-auth-outage', title: 'Authentication outage', severity: 'critical', status: 'investigating', startedAt: '2026-08-18T08:15:00.000Z', resolvedAt: null, description: 'Customers cannot sign in or refresh access tokens.' },
  { id: 'inc-payment-degradation', title: 'Payment processing degradation', severity: 'high', status: 'monitoring', startedAt: '2026-08-17T14:20:00.000Z', resolvedAt: null, description: 'Payment authorization latency and failure rates are elevated.' },
  { id: 'inc-inventory-sync', title: 'Inventory synchronization failure', severity: 'high', status: 'resolved', startedAt: '2026-08-14T09:00:00.000Z', resolvedAt: '2026-08-14T11:45:00.000Z', description: 'Warehouse stock updates were delayed across sales channels.' },
  { id: 'inc-notification-disruption', title: 'Notification delivery disruption', severity: 'medium', status: 'resolved', startedAt: '2026-08-12T16:10:00.000Z', resolvedAt: '2026-08-12T18:05:00.000Z', description: 'Transactional emails were queued because of provider errors.' },
  { id: 'inc-search-latency', title: 'Search latency spike', severity: 'medium', status: 'investigating', startedAt: '2026-08-18T10:30:00.000Z', resolvedAt: null, description: 'Product search response times exceed the service objective.' },
];

const dependsOn = [
  ['svc-storefront', 'svc-gateway'], ['svc-storefront', 'svc-checkout'], ['svc-storefront', 'svc-search'], ['svc-storefront', 'svc-recommendation'],
  ['svc-gateway', 'svc-auth'], ['svc-gateway', 'svc-profile'], ['svc-gateway', 'svc-cart'], ['svc-gateway', 'svc-order'],
  ['svc-profile', 'svc-auth'], ['svc-cart', 'svc-pricing'], ['svc-cart', 'svc-inventory'],
  ['svc-checkout', 'svc-cart'], ['svc-checkout', 'svc-payment'], ['svc-checkout', 'svc-inventory'], ['svc-checkout', 'svc-pricing'], ['svc-checkout', 'svc-order'],
  ['svc-payment', 'svc-auth'], ['svc-payment', 'svc-fraud'], ['svc-fraud', 'svc-auth'],
  ['svc-order', 'svc-inventory'], ['svc-order', 'svc-payment'], ['svc-order', 'svc-notification'], ['svc-order', 'svc-shipping'],
  ['svc-search', 'svc-inventory'], ['svc-search', 'svc-pricing'], ['svc-recommendation', 'svc-analytics'],
  ['svc-review', 'svc-auth'], ['svc-admin', 'svc-auth'], ['svc-admin', 'svc-analytics'],
];

const uses = [
  ['svc-auth', 'db-users'], ['svc-profile', 'db-users'], ['svc-cart', 'db-orders'], ['svc-order', 'db-orders'],
  ['svc-inventory', 'db-inventory'], ['svc-pricing', 'db-inventory'], ['svc-search', 'db-inventory'],
  ['svc-recommendation', 'db-analytics'], ['svc-review', 'db-orders'], ['svc-analytics', 'db-analytics'], ['svc-admin', 'db-analytics'],
];

const calls = [
  ['svc-payment', 'api-stripe'], ['svc-notification', 'api-sendgrid'],
  ['svc-shipping', 'api-shipping'], ['svc-fraud', 'api-fraud'],
];

const owns = [
  ['team-identity', 'svc-auth'], ['team-identity', 'svc-profile'],
  ['team-commerce', 'svc-storefront'], ['team-commerce', 'svc-cart'], ['team-commerce', 'svc-checkout'], ['team-commerce', 'svc-order'], ['team-commerce', 'svc-inventory'], ['team-commerce', 'svc-pricing'], ['team-commerce', 'svc-review'],
  ['team-payments', 'svc-payment'], ['team-payments', 'svc-fraud'],
  ['team-platform', 'svc-gateway'], ['team-platform', 'svc-notification'], ['team-platform', 'svc-shipping'], ['team-platform', 'svc-admin'],
  ['team-data', 'svc-search'], ['team-data', 'svc-recommendation'], ['team-data', 'svc-analytics'],
];

const affects = [
  ['inc-auth-outage', 'svc-auth'],
  ['inc-payment-degradation', 'svc-payment'], ['inc-payment-degradation', 'svc-fraud'],
  ['inc-inventory-sync', 'svc-inventory'], ['inc-notification-disruption', 'svc-notification'], ['inc-search-latency', 'svc-search'],
];

const constraints = [
  ['impactgraph_service_id_unique', 'Service'],
  ['impactgraph_database_id_unique', 'Database'],
  ['impactgraph_external_api_id_unique', 'ExternalAPI'],
  ['impactgraph_team_id_unique', 'Team'],
  ['impactgraph_incident_id_unique', 'Incident'],
];

const nodeGroups = [
  ['Service', services], ['Database', databases], ['ExternalAPI', externalApis],
  ['Team', teams], ['Incident', incidents],
];

const relationshipGroups = [
  ['Service', 'DEPENDS_ON', 'Service', dependsOn],
  ['Service', 'USES', 'Database', uses],
  ['Service', 'CALLS', 'ExternalAPI', calls],
  ['Team', 'OWNS', 'Service', owns],
  ['Incident', 'AFFECTS', 'Service', affects],
];

const expectedNodeCounts = Object.fromEntries(
  nodeGroups.map(([label, nodes]) => [label, nodes.length])
);
const expectedRelationshipCounts = Object.fromEntries(
  relationshipGroups.map(([, type, , relationships]) => [type, relationships.length])
);

function toNumber(value) {
  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

async function createConstraints() {
  for (const [name, label] of constraints) {
    await driver.executeQuery(
      `CREATE CONSTRAINT ${name} IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`
    );
  }

  console.log(`Constraints ready: ${constraints.length}`);
}

async function replaceDataset() {
  const session = driver.session();

  try {
    await session.executeWrite(async (transaction) => {
      await transaction.run(
        'MATCH (n {dataset: $dataset}) DETACH DELETE n',
        { dataset: DATASET }
      );

      for (const [label, nodes] of nodeGroups) {
        await transaction.run(
          `UNWIND $nodes AS row MERGE (n:${label} {id: row.id}) SET n = row`,
          { nodes: nodes.map((node) => ({ ...node, dataset: DATASET })) }
        );
      }

      for (const [fromLabel, type, toLabel, relationships] of relationshipGroups) {
        await transaction.run(
          `UNWIND $relationships AS relationship
           MATCH (source:${fromLabel} {id: relationship.from, dataset: $dataset})
           MATCH (target:${toLabel} {id: relationship.to, dataset: $dataset})
           MERGE (source)-[:${type}]->(target)`,
          {
            dataset: DATASET,
            relationships: relationships.map(([from, to]) => ({ from, to })),
          }
        );
      }
    });
  } finally {
    await session.close();
  }
}

async function getCounts() {
  const nodeResult = await driver.executeQuery(
    `MATCH (n {dataset: $dataset})
     UNWIND labels(n) AS label
     RETURN label, count(n) AS count
     ORDER BY label`,
    { dataset: DATASET },
    { routing: neo4j.routing.READ }
  );
  const relationshipResult = await driver.executeQuery(
    `MATCH (source {dataset: $dataset})-[relationship]->(target {dataset: $dataset})
     RETURN type(relationship) AS type, count(relationship) AS count
     ORDER BY type`,
    { dataset: DATASET },
    { routing: neo4j.routing.READ }
  );

  return {
    nodes: Object.fromEntries(
      nodeResult.records.map((record) => [record.get('label'), toNumber(record.get('count'))])
    ),
    relationships: Object.fromEntries(
      relationshipResult.records.map((record) => [record.get('type'), toNumber(record.get('count'))])
    ),
  };
}

function assertCounts(actual, expected, category) {
  for (const [key, count] of Object.entries(expected)) {
    if (actual[key] !== count) {
      throw new Error(`${category} validation failed for ${key}`);
    }
  }

  if (Object.keys(actual).length !== Object.keys(expected).length) {
    throw new Error(`${category} validation found unexpected entries`);
  }
}

async function validateGraph() {
  const counts = await getCounts();
  assertCounts(counts.nodes, expectedNodeCounts, 'Node count');
  assertCounts(counts.relationships, expectedRelationshipCounts, 'Relationship count');

  const chainResult = await driver.executeQuery(
    `MATCH (:Service {id: $storefrontId, dataset: $dataset})-[:DEPENDS_ON]->
           (:Service {id: $checkoutId, dataset: $dataset})-[:DEPENDS_ON]->
           (:Service {id: $paymentId, dataset: $dataset})-[:DEPENDS_ON]->
           (:Service {id: $authenticationId, dataset: $dataset})
     RETURN count(*) AS count`,
    {
      dataset: DATASET,
      storefrontId: 'svc-storefront', checkoutId: 'svc-checkout',
      paymentId: 'svc-payment', authenticationId: 'svc-auth',
    },
    { routing: neo4j.routing.READ }
  );
  if (toNumber(chainResult.records[0].get('count')) !== 1) {
    throw new Error('Required Storefront dependency chain is missing');
  }

  const blastRadiusResult = await driver.executeQuery(
    `MATCH (:Service {id: $serviceId, dataset: $dataset})
           <-[:DEPENDS_ON*1..6]-(affected:Service {dataset: $dataset})
     RETURN DISTINCT affected.id AS id
     ORDER BY id`,
    { dataset: DATASET, serviceId: 'svc-auth' },
    { routing: neo4j.routing.READ }
  );
  const blastRadius = blastRadiusResult.records.map((record) => record.get('id'));
  const requiredDependents = ['svc-payment', 'svc-checkout', 'svc-storefront'];
  if (!requiredDependents.every((id) => blastRadius.includes(id))) {
    throw new Error('Authentication blast-radius validation failed');
  }

  const ownershipResult = await driver.executeQuery(
    `MATCH (service:Service {dataset: $dataset})
     OPTIONAL MATCH (owner:Team {dataset: $dataset})-[:OWNS]->(service)
     WITH service, count(owner) AS owners
     RETURN count(service) AS services,
            sum(CASE WHEN owners = 1 THEN 1 ELSE 0 END) AS correctlyOwned`,
    { dataset: DATASET },
    { routing: neo4j.routing.READ }
  );
  const ownershipRecord = ownershipResult.records[0];
  if (
    toNumber(ownershipRecord.get('services')) !== services.length ||
    toNumber(ownershipRecord.get('correctlyOwned')) !== services.length
  ) {
    throw new Error('Team ownership validation failed');
  }

  return { counts, blastRadius };
}

async function seed() {
  console.log('Starting deterministic ImpactGraph seed...');
  await createConstraints();
  await replaceDataset();
  const validation = await validateGraph();

  console.log(`Node counts: ${JSON.stringify(validation.counts.nodes)}`);
  console.log(`Relationship counts: ${JSON.stringify(validation.counts.relationships)}`);
  console.log(`Authentication blast radius: ${JSON.stringify(validation.blastRadius)}`);
  console.log('ImpactGraph seed and validation completed successfully.');
}

seed()
  .catch((error) => {
    const errorCode = typeof error.code === 'string' ? ` (code: ${error.code})` : '';
    console.error(`ImpactGraph seed failed${errorCode}.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeDriver();
    } catch {
      console.error('Failed to close the graph database driver cleanly.');
      process.exitCode = 1;
    }
  });
