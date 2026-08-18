const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');

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

module.exports = app;
