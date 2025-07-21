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

async function getResources() {
  if (!apiClient) throw new Error('API client no inicializado');
  const { data } = await apiClient.post('/getResources', {
    CENTER_LID: process.env.SALUS_CENTER_LID
  });
  return data;
}

async function getActivities(resourceLid) {
  if (!apiClient) throw new Error('API client no inicializado');
  const { data } = await apiClient.post('/getActivities', {
    RESOURCE_LID: resourceLid
  });
  return data;
}

// --- FUNCIÓN getInsurances ---
async function getInsurances() {
  if (!apiClient) throw new Error('API client no inicializado');
  const { data } = await apiClient.post('/getInsurances', {});
  return data;
}

// --- FUNCIÓN getAvailabilities ---
async function getAvailabilities(body) {
  if (!apiClient) throw new Error('API client no inicializado');
  const { data } = await apiClient.post('/searchAvailabilities', body);
  return data;
}

module.exports = {
  initializeHost,
  getResources,
  getActivities,
  getInsurances,
  getAvailabilities,
};