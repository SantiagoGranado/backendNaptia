// routes/appointments.js
const express = require('express');
const router = express.Router();
const { initializeHost, createAppointment, getPatients } = require('../salusApi');

// Middleware validación rápida
function validateAppointment(req, res, next) {
  const required = [
    'USER_FIRST_NAME',
    'USER_SECOND_NAME',
    'USER_DATE_OF_BIRTH',
    'APP_DATE',
    'APP_START_TIME',
    'RESOURCE_LID',
    'ACTIVITY_LID'
  ];
  const missing = required.filter(k => !req.body[k]);
  if (missing.length)
    return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
  next();
}

router.post('/create', validateAppointment, async (req, res) => {
  try {
    await initializeHost();

    const {
      USER_FIRST_NAME,
      USER_SECOND_NAME,
      USER_DATE_OF_BIRTH
      // ...otros campos que recibas y quieras pasar
    } = req.body;

    // Buscar paciente en Salus
    const patients = await getPatients({
      USER_FIRST_NAME,
      USER_SECOND_NAME,
      USER_DATE_OF_BIRTH
    });

    let USER_LID = patients?.[0]?.USER_LID;

    // Monta el payload para la cita
    const citaPayload = {
      ...req.body,
      ...(USER_LID ? { USER_LID } : {})
      // Si hay USER_LID, lo añade al payload, si no, manda los datos personales que ya están en req.body
    };

    const result = await createAppointment(citaPayload);
    res.json(result);

  } catch (err) {
    console.error('❌ Error al crear cita:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
