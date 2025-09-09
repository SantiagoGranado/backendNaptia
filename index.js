require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeHost } = require('./salusApi');
const { precargaCache } = require('./cache');

// Routers
const especialidadesRouter = require('./router/especialidades');
const provinciasRouter = require('./router/provincias');
const hospitalesRouter = require('./router/hospitales');
const profesionalesRouter = require('./router/profesionales');
const insurancesRouter = require('./router/insurances');
const availabilitiesRouter = require('./router/availability');
const appointmentsRouter = require('./router/appointments'); // incluye create, start-private y confirm-payment
const activitiesByResourceRouter = require('./router/activitiesByResource');

async function main() {
  try {
    // Inicializar conexión con Salus y precargar caché
    await initializeHost();
    await precargaCache();

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Monta los routers de la API
    app.use('/api/provincias', provinciasRouter);
    app.use('/api/hospitales', hospitalesRouter);
    app.use('/api/especialidades', especialidadesRouter);
    app.use('/api/profesionales', profesionalesRouter);
    app.use('/api/insurances', insurancesRouter);
    app.use('/api/availabilities', availabilitiesRouter);
    app.use('/api/appointments', appointmentsRouter);
    app.use('/api/activities/byResourceAndGroup', activitiesByResourceRouter);

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Error iniciando servidor:', err);
    process.exit(1);
  }
}

main();
