const express = require('express');
const router = express.Router();
const { getCachedSpecialtiesByInsurance } = require('../cache');

router.get('/', (req, res) => {
  const insuranceLid = req.query.insuranceLid;
  if (!insuranceLid) {
    return res.status(400).json({ error: 'Falta insuranceLid' });
  }

  try {
    const activities = getCachedSpecialtiesByInsurance(insuranceLid);
    res.json(activities);
  } catch (err) {
    console.error('Error al obtener actividades del cache:', err.message);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

module.exports = router;
