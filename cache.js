const { getResources, getActivities, getInsurances } = require('./salusApi'); // Añade getInsurances

let cache = {
  provincias: [],
  hospitales: [],
  especialidades: {},
  recursos: [],
  profesionales: [],
  insurances: []   // Añade insurances aquí
};

// -------- FUNCIONES AUXILIARES --------
function extraerCiudad(direccion = "") {
  const m = direccion.match(/- ?\d{5} (.+)$/i);
  if (m) return m[1].trim();
  return "";
}

// -------- PRECARGA DE CACHE --------
async function precargaCache() {
  try {
    const recursos = await getResources();
    cache.recursos = recursos;

    // Extraer provincias/ciudades únicas
    cache.provincias = [...new Set(recursos.map(r => extraerCiudad(r.LOCATION_ADDRESS)))]
      .filter(Boolean)
      .map((nombre, i) => ({ id: i + 1, nombre }));

    // Hospitales/Centros
    cache.hospitales = recursos.map(r => ({
      id: r.LOCATION_LID,
      nombre: r.LOCATION_NAME,
      provincia: extraerCiudad(r.LOCATION_ADDRESS),
      direccion: r.LOCATION_ADDRESS,
      resourceId: r.RESOURCE_LID,
      agenda: r.RESOURCE_FIRST_NAME,
    }));

    // Especialidades por hospital/centro (resourceId)
    cache.especialidades = {};
    for (const r of recursos) {
      const acts = await getActivities(r.RESOURCE_LID);
      const especialidadesUnicas = [];
      const nombresUnicos = new Set();
      acts.forEach(a => {
        if (!nombresUnicos.has(a.ACTIVITY_GROUP_NAME) && a.ACTIVITY_GROUP_NAME) {
          especialidadesUnicas.push({
            id: a.ACTIVITY_GROUP_LID,
            nombre: a.ACTIVITY_GROUP_NAME,
          });
          nombresUnicos.add(a.ACTIVITY_GROUP_NAME);
        }
      });
      cache.especialidades[r.RESOURCE_LID] = especialidadesUnicas;
    }

    // Profesionales (por hospital y especialidades que atienden)
    cache.profesionales = recursos.map(r => {
      return {
        id: r.RESOURCE_LID,
        nombre: [r.RESOURCE_FIRST_NAME, r.RESOURCE_LAST_NAME].filter(Boolean).join(" "),
        hospital: r.LOCATION_NAME,
        provincia: extraerCiudad(r.LOCATION_ADDRESS),
        hospitalId: r.LOCATION_LID,
        especialidades: [], // se rellena abajo
      };
    });

    // Asocia especialidades a cada profesional (por resourceId)
    for (const r of recursos) {
      const acts = await getActivities(r.RESOURCE_LID);
      const especialidades = [
        ...new Set(
          acts.filter(a => a.ACTIVITY_GROUP_NAME).map(a => ({
            id: a.ACTIVITY_GROUP_LID,
            nombre: a.ACTIVITY_GROUP_NAME
          }))
        ),
      ];
      const profesional = cache.profesionales.find(p => p.id === r.RESOURCE_LID);
      if (profesional) profesional.especialidades = especialidades;
    }

    // Carga las aseguradoras (insurances) aquí
    cache.insurances = await getInsurances();

    console.log('✅ Cache precargada');
  } catch (err) {
    console.error('❌ Error precargando cache:', err.message);
  }
}

// -------- FUNCIONES DE OBTENCIÓN DE DATOS --------

function getCachedProvincias() {
  return cache.provincias;
}

function getCachedHospitales(provincia) {
  if (!provincia) return cache.hospitales;
  return cache.hospitales.filter(h => h.provincia === provincia);
}

function getCachedEspecialidades(hospitalResourceId) {
  return cache.especialidades[hospitalResourceId] || [];
}

function getCachedResources() {
  return cache.recursos;
}

// NUEVA FUNCIÓN para aseguradoras
function getCachedInsurances() {
  return cache.insurances;
}

/**
 * Devuelve los profesionales filtrados por cualquier combinación:
 *  - hospitalId: id del hospital/centro
 *  - especialidadId: id de la especialidad
 *  - nombre: string a buscar en el nombre del profesional
 *  - provincia: filtra por provincia si lo deseas
 */
function getCachedProfesionales({ hospitalId, especialidadId, nombre, provincia } = {}) {
  return cache.profesionales.filter(p => {
    // Filtra por hospitalId si viene
    const matchHospital = !hospitalId || String(p.hospitalId) === String(hospitalId);
    // Filtra por especialidadId si viene
    const matchEspecialidad = !especialidadId ||
      (p.especialidades && p.especialidades.some(e => String(e.id) === String(especialidadId)));
    // Filtra por nombre si viene
    const matchNombre = !nombre ||
      (p.nombre && p.nombre.toLowerCase().includes(nombre.toLowerCase()));
    // Filtra por provincia si viene
    const matchProvincia = !provincia ||
      (p.provincia && p.provincia.toLowerCase() === provincia.toLowerCase());

    return matchHospital && matchEspecialidad && matchNombre && matchProvincia;
  });
}

// ------- EXPORTA FUNCIONES --------

module.exports = {
  precargaCache,
  getCachedProvincias,
  getCachedHospitales,
  getCachedEspecialidades,
  getCachedResources,
  getCachedProfesionales,
  getCachedInsurances
};
