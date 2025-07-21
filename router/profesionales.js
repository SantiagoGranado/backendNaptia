// backend/router/profesionales.js
const express = require('express');
const { getCachedProfesionales } = require('../cache');
const router = express.Router();

router.get('/', (req, res) => {
  // Extrae los query params
  const hospitalId = req.query.hospitalId;
  const especialidadId = req.query.especialidadId || req.query.especialidad; // soporte por si mandas 'especialidad'
  const nombre = req.query.nombre;
  const provincia = req.query.provincia;

  // Llama pasando todos los filtros posibles
  res.json(getCachedProfesionales({ hospitalId, especialidadId, nombre, provincia }));
});

module.exports = router;
