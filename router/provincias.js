// backend/router/provincias.js
const express = require('express');
const router = express.Router();
const { getCachedProvincias } = require('../cache');

router.get('/', (req, res) => {
  res.json(getCachedProvincias());
});

module.exports = router;
