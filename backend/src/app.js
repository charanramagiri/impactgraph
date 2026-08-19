const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const dashboardRouter = require('./routes/dashboard');
const servicesRouter = require('./routes/services');
const graphRouter = require('./routes/graph');
const criticalDependenciesRouter = require('./routes/criticalDependencies');
const incidentsRouter = require('./routes/incidents');

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

module.exports = app;
