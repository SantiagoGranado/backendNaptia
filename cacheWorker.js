const {
  initializeHost,
  getAllUniqueInsurances,
  getAvailableActivitiesByInsurance
} = require('./salusApi');

// Función para esperar un tiempo (ms)
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function tryLoadData(maxRetries = 20, delayMs = 3000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initializeHost(); // Inicializa el host cada vez (por si cambia)
      const insurances = await getAllUniqueInsurances();
      const specialtiesByInsurance = {};
      for (const insurance of insurances) {
        try {
          const activities = await getAvailableActivitiesByInsurance(insurance.INSURANCE_LID);
          specialtiesByInsurance[insurance.INSURANCE_LID] = activities;
        } catch (err) {
          specialtiesByInsurance[insurance.INSURANCE_LID] = [];
        }
      }
      return {
        insurances,
        specialtiesByInsurance,
        lastUpdate: new Date()
      };
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        // Solo loguea el último intento, para no llenar la consola
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

module.exports = async function () {
  return tryLoadData();
};
