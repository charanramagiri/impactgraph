const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const dashboardRouter = require('./routes/dashboard');
const servicesRouter = require('./routes/services');
const graphRouter = require('./routes/graph');
const criticalDependenciesRouter = require('./routes/criticalDependencies');
const incidentsRouter = require('./routes/incidents');
const { logSafeError } = require('./utils/httpErrors');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'ImpactGraph API is running' });
});

app.use('/api/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/services', servicesRouter);
app.use('/api/graph', graphRouter);
app.use('/api/critical-dependencies', criticalDependenciesRouter);
app.use('/api/incidents', incidentsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof URIError) {
    res.status(400).json({ error: 'Malformed request path.' });
    return;
  }

  if (error instanceof SyntaxError && error.status === 400) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  logSafeError('Unexpected request error', error);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
