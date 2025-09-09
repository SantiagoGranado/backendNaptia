const express = require('express');
const router = express.Router();
const { getCachedEspecialidadesGlobales } = require('../cache');

// GET /api/especialidades
// Siempre devuelve todas las especialidades únicas sin distinción de centro
router.get('/', (req, res) => {
  res.json(getCachedEspecialidadesGlobales());
});

module.exports = router;