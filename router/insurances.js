const express = require('express');
const router = express.Router();
const { getCachedInsurances } = require('../cache');

router.get('/', (req, res) => {
  try {
    const insurances = getCachedInsurances();

    res.json(insurances);
  } catch (err) {
    console.error('Error al obtener aseguradoras del cache:', err.message, err);
    res.status(500).json({ error: 'Error al obtener aseguradoras' });
  }
});

module.exports = router;
