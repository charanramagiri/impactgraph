const express = require('express');
const cors = require('cors');

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

module.exports = app;
