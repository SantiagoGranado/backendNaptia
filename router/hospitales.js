const express = require('express');
const { getCachedHospitales } = require('../cache');
const router = express.Router();

router.get('/', (req, res) => {
  const provincia = req.query.provincia;
  res.json(getCachedHospitales(provincia));
});

module.exports = router;