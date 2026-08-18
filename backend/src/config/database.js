const neo4j = require('neo4j-driver');

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'COGNODB_URI',
  'COGNODB_USER',
  'COGNODB_PASSWORD',
];

const missingVariables = REQUIRED_ENVIRONMENT_VARIABLES.filter(
  (name) => !process.env[name] || !process.env[name].trim()
);

if (missingVariables.length > 0) {
  const error = new Error(
    `Missing required environment variable(s): ${missingVariables.join(', ')}`
  );
  error.code = 'MISSING_ENVIRONMENT_VARIABLES';
  throw error;
}

const driver = neo4j.driver(
  process.env.COGNODB_URI,
  neo4j.auth.basic(
    process.env.COGNODB_USER,
    process.env.COGNODB_PASSWORD
  ),
  {
    connectionTimeout: 10000,
    connectionAcquisitionTimeout: 10000,
    maxTransactionRetryTime: 5000,
  }
);

let closePromise;

async function verifyConnectivity() {
  const result = await driver.executeQuery(
    'RETURN 1 AS result',
    {},
    { routing: neo4j.routing.READ }
  );

  return result.records.length === 1 && result.records[0].has('result');
}

function closeDriver() {
  if (!closePromise) {
    closePromise = driver.close();
  }

  return closePromise;
}

module.exports = {
  driver,
  verifyConnectivity,
  closeDriver,
};
