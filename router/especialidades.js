const express = require('express');
const router = express.Router();
const { getActivities } = require('../salusApi');

// Esta función extrae especialidades únicas
function extraerEspecialidadesUnicas(lista) {
  const especialidadesUnicas = [];
  const idsUnicos = new Set();
  for (const item of lista) {
    if (item.ACTIVITY_GROUP_LID && !idsUnicos.has(item.ACTIVITY_GROUP_LID)) {
      especialidadesUnicas.push({
        id: item.ACTIVITY_GROUP_LID,
        nombre: item.ACTIVITY_GROUP_NAME
      });
      idsUnicos.add(item.ACTIVITY_GROUP_LID);
    }
  }
  return especialidadesUnicas;
}

// GET /api/especialidades  (Devuelve todas las especialidades únicas)
router.get('/', async (req, res) => {
  try {
    // Sin parámetro = globales
    const activities = await getActivities(); // Llama a la API, sin RESOURCE_LID
    const especialidades = extraerEspecialidadesUnicas(activities);
    res.json(especialidades);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo especialidades', detalle: err.message });
  }
});

module.exports = router;
