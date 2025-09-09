// router/availability.js

const express = require('express');
const router = express.Router();
const { getAvailabilities } = require('../salusApi');

/**
 * POST /api/availabilities
 * Body parameters expected:
 *   - RESOURCE_LID
 *   - ACTIVITY_LID
 *   - LOCATION_LID
 *   - INSURANCE_LID
 *   - AVA_START_DAY
 *   - AVA_END_DAY
 *   - AVA_START_TIME
 *   - AVA_END_TIME
 *   - AVA_MIN_TIME
 *   - AVA_MAX_TIME
 *   - AVA_RESULTS_NUMBER
 *
 * Devuelve los huecos disponibles para el profesional y actividad indicados.
 */
router.post('/', async (req, res) => {
  // Log para depuración: muestra el body recibido
  console.log('🔍 Disponibilities Request body:', req.body);

  try {
    // Desestructuramos solo los campos necesarios del body
    const {
      RESOURCE_LID,
      ACTIVITY_LID,
      LOCATION_LID,
      INSURANCE_LID,
      AVA_START_DAY,
      AVA_END_DAY,
      AVA_START_TIME,
      AVA_END_TIME,
      AVA_MIN_TIME,
      AVA_MAX_TIME,
      AVA_RESULTS_NUMBER,
    } = req.body;

    // Validación de campos obligatorios
    if (!RESOURCE_LID || !ACTIVITY_LID || !LOCATION_LID) {
      return res
        .status(400)
        .json({ error: 'Faltan parámetros obligatorios en la petición' });
    }

    // Llamada directa al endpoint NetAPI a través del cliente autenticado
    const availabilities = await getAvailabilities({
      RESOURCE_LID,
      ACTIVITY_LID,
      LOCATION_LID,
      INSURANCE_LID,
      AVA_START_DAY,
      AVA_END_DAY,
      AVA_START_TIME,
      AVA_END_TIME,
      AVA_MIN_TIME,
      AVA_MAX_TIME,
      AVA_RESULTS_NUMBER,
    });

    return res.json(availabilities);
  } catch (err) {
    console.error('Error al obtener disponibilidades:', err.message || err);
    return res
      .status(500)
      .json({ error: 'Error al obtener disponibilidades' });
  }
});

module.exports = router;
