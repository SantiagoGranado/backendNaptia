require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeHost } = require('./salusApi');
const { precargaCache } = require('./cache');

const especialidadesRouter = require('./router/especialidades');
const provinciasRouter = require('./router/provincias');
const hospitalesRouter = require('./router/hospitales');
const profesionalesRouter = require('./router/profesionales');
const insurancesRouter = require('./router/insurances');
const availabilitiesRouter = require('./router/availability');
const appointmentsRouter = require('./router/appointments');

async function main() {
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


  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log('✅ Servidor escuchando en el puerto', PORT);
  });
}

main().catch(err => {
  console.error('Error iniciando servidor:', err);
  process.exit(1);
});