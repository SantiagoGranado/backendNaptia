const axios = require('axios');

const INITIAL_HOST = 'https://wscentral.e-salus.com';
const CLIENT_ID = process.env.SALUS_CLIENT_ID;
const AUTH_HEADER = process.env.SALUS_AUTHORIZATION;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

let apiClient = null;

// Inicializa el host de la API y el cliente axios
async function initializeHost() {
  const resp = await axios.post(
    `${INITIAL_HOST}/api/central/GetConnectionById`,
    { clientid: CLIENT_ID },
    { headers: JSON_HEADERS }
  );
  const host = resp.data.url;
  if (!host) throw new Error('GetConnectionById no devolvió host');

  apiClient = axios.create({
    baseURL: `https://${host}/api/netapi`,
    headers: {
      clientid: CLIENT_ID,
      Authorization: AUTH_HEADER,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

// Comprueba si el cliente está inicializado antes de cada llamada
function checkInitialized() {
  if (!apiClient) throw new Error('API client no inicializado');
}

// --- NUEVA FUNCIÓN: Buscar pacientes ---
async function getPatients(body) {
  checkInitialized();
  const { data } = await apiClient.post('/getPatients', body);
  return data;
}

// --- NUEVA FUNCIÓN: Crear cita ---
async function createAppointment(body) {
  checkInitialized();
  const { data } = await apiClient.post('/addAppointment', body);
  return data;
}

// --- FUNCIONES EXISTENTES ---
async function getResources() {
  checkInitialized();
  const { data } = await apiClient.post('/getResources', {
    CENTER_LID: process.env.SALUS_CENTER_LID
  });
  return data;
}

async function getActivities(resourceLid) {
  checkInitialized();
  const { data } = await apiClient.post('/getActivities', {
    RESOURCE_LID: resourceLid
  });
  return data;
}

async function getInsurances() {
  checkInitialized();
  const { data } = await apiClient.post('/getInsurances', {});
  return data;
}

async function getAvailabilities(body) {
  checkInitialized();
  const { data } = await apiClient.post('/searchAvailabilities', body);
  return data;
}

module.exports = {
  initializeHost,
  getResources,
  getActivities,
  getInsurances,
  getAvailabilities,
  getPatients,
  createAppointment
};
