// router/activitiesByResource.js

const express = require('express');
const router = express.Router();
const { getCachedActivitiesByResource } = require('../cache');

/**
 * GET /api/activities/byResourceAndGroup
 * Query params:
 *   - resourceLid: ID del recurso (Profesional)
 *   - groupLid: ID del grupo de actividad (Especialidad)
 *
 * Devuelve el listado de actividades (tipos de visita) para el recurso y grupo indicados.
 */
router.get('/', (req, res) => {
  const { resourceLid, groupLid } = req.query;

  // Validar existencia de parámetros
  if (!resourceLid || !groupLid) {
    return res
      .status(400)
      .json({ error: 'Faltan parámetros: resourceLid y groupLid' });
  }

  const resourceId = Number(resourceLid);
  const groupId = Number(groupLid);
  if (Number.isNaN(resourceId) || Number.isNaN(groupId)) {
    return res.status(400).json({ error: 'resourceLid o groupLid inválidos' });
  }

  try {
    // Obtener todas las actividades para el recurso desde la caché
    const activities = getCachedActivitiesByResource(resourceId);

    // Filtrar por el grupo de actividad
    const filtered = activities.filter(
      (act) => Number(act.ACTIVITY_GROUP_LID) === groupId
    );

    // Mapear los campos necesarios para el frontend
    const result = filtered.map(({ ACTIVITY_LID, ACTIVITY_NAME }) => ({
      ACTIVITY_LID,
      ACTIVITY_NAME,
    }));

    // Log para depuración
    console.log({
      resourceId,
      groupId,
      totalFetched: activities.length,
      totalAfterFilter: filtered.length,
    });

    return res.json(result);
  } catch (err) {
    console.error('Error al obtener actividades del cache:', err.message);
    return res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

module.exports = router;
