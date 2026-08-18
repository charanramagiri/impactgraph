require('dotenv').config();

let app;
let closeDriver;

try {
  ({ closeDriver } = require('./src/config/database'));
  app = require('./src/app');
} catch (error) {
  if (error.code === 'MISSING_ENVIRONMENT_VARIABLES') {
    console.error(`Startup failed: ${error.message}`);
  } else {
    console.error('Startup failed while initializing the application.');
  }

  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`ImpactGraph API listening on port ${PORT}`);
});

let shutdownPromise;

function shutdown(signal) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  console.log(`Received ${signal}. Shutting down ImpactGraph API...`);

  shutdownPromise = new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  })
    .then(() => closeDriver())
    .then(() => {
      console.log('ImpactGraph API shut down cleanly.');
      process.exit(0);
    })
    .catch(() => {
      console.error('ImpactGraph API shutdown failed.');
      process.exit(1);
    });

  return shutdownPromise;
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
