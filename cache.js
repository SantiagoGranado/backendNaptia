const { getResources, getActivities, getInsurances } = require("./salusApi");

let cache = {
  provincias: [],
  hospitales: [],
  especialidades: {},
  recursos: [],
  profesionales: [],
  insurances: [],
  activitiesByResource: {}, // 👈 Nuevo
};

function extraerCiudad(direccion = "") {
  const m = direccion.match(/- ?\d{5} (.+)$/i);
  return m ? m[1].trim() : "";
}

async function precargaCache() {
  try {
    const recursos = await getResources();
    cache.recursos = recursos;

    cache.provincias = [
      ...new Set(recursos.map((r) => extraerCiudad(r.LOCATION_ADDRESS))),
    ]
      .filter(Boolean)
      .map((nombre, i) => ({ id: i + 1, nombre }));

    cache.hospitales = recursos.map((r) => ({
      id: r.LOCATION_LID,
      nombre: r.LOCATION_NAME,
      provincia: extraerCiudad(r.LOCATION_ADDRESS),
      direccion: r.LOCATION_ADDRESS,
      resourceId: r.RESOURCE_LID,
      agenda: r.RESOURCE_FIRST_NAME,
    }));

    cache.especialidades = {};
    cache.activitiesByResource = {};

    for (const r of recursos) {
      const acts = await getActivities(r.RESOURCE_LID);
      cache.activitiesByResource[r.RESOURCE_LID] = acts;

      const especialidadesUnicas = [];
      const vistos = new Set();
      acts.forEach((a) => {
        if (a.ACTIVITY_GROUP_NAME && !vistos.has(a.ACTIVITY_GROUP_NAME)) {
          vistos.add(a.ACTIVITY_GROUP_NAME);
          especialidadesUnicas.push({
            id: a.ACTIVITY_GROUP_LID,
            nombre: a.ACTIVITY_GROUP_NAME,
          });
        }
      });
      cache.especialidades[r.RESOURCE_LID] = especialidadesUnicas;
    }

    cache.profesionales = recursos.map((r) => ({
      id: r.RESOURCE_LID,
      nombre: [r.RESOURCE_FIRST_NAME, r.RESOURCE_LAST_NAME]
        .filter(Boolean)
        .join(" "),
      hospital: r.LOCATION_NAME,
      provincia: extraerCiudad(r.LOCATION_ADDRESS),
      hospitalId: r.LOCATION_LID,
      especialidades: [],
    }));

    for (const r of recursos) {
      const acts = cache.activitiesByResource[r.RESOURCE_LID];
      const especialidades = [
        ...new Map(
          acts
            .filter((a) => a.ACTIVITY_GROUP_NAME)
            .map((a) => [
              a.ACTIVITY_GROUP_LID,
              { id: a.ACTIVITY_GROUP_LID, nombre: a.ACTIVITY_GROUP_NAME },
            ])
        ).values(),
      ];
      const profesional = cache.profesionales.find(
        (p) => p.id === r.RESOURCE_LID
      );
      if (profesional) profesional.especialidades = especialidades;
    }

    cache.insurances = await getInsurances();
    console.log("✅ Cache precargada");
  } catch (err) {
    console.error("❌ Error precargando cache:", err.message);
  }
}

// Funciones de acceso a la caché
function getCachedProvincias() {
  return cache.provincias;
}

function getCachedHospitales(provincia) {
  return provincia
    ? cache.hospitales.filter((h) => h.provincia === provincia)
    : cache.hospitales;
}

function getCachedEspecialidades(hospitalResourceId) {
  return cache.especialidades[hospitalResourceId] || [];
}

function getCachedEspecialidadesGlobales() {
  const todas = [];
  const vistos = new Set();
  Object.values(cache.especialidades).forEach((lista) => {
    lista.forEach((e) => {
      if (!vistos.has(e.id)) {
        vistos.add(e.id);
        todas.push(e);
      }
    });
  });
  return todas;
}

function getCachedResources() {
  return cache.recursos;
}

function getCachedInsurances() {
  return cache.insurances;
}

function getCachedProfesionales({
  hospitalId,
  especialidadId,
  nombre,
  provincia,
} = {}) {
  return cache.profesionales.filter((p) => {
    const matchHospital =
      !hospitalId || String(p.hospitalId) === String(hospitalId);
    const matchEspecialidad =
      !especialidadId ||
      p.especialidades.some((e) => String(e.id) === String(especialidadId));
    const matchNombre =
      !nombre || p.nombre.toLowerCase().includes(nombre.toLowerCase());
    const matchProvincia =
      !provincia || p.provincia.toLowerCase() === provincia.toLowerCase();
    return matchHospital && matchEspecialidad && matchNombre && matchProvincia;
  });
}

function getCachedActivitiesByResource(resourceLid) {
  return cache.activitiesByResource[resourceLid] || [];
}

module.exports = {
  precargaCache,
  getCachedProvincias,
  getCachedHospitales,
  getCachedEspecialidades,
  getCachedEspecialidadesGlobales,
  getCachedResources,
  getCachedProfesionales,
  getCachedInsurances,
  getCachedActivitiesByResource,
};