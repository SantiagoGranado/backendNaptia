const express = require("express");
const router = express.Router();
const { getAvailabilities } = require("../salusApi");

// --- Función util para hacer reintentos ---
async function retryPromise(fn, retries = 3, delayMs = 800) {
  let error;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      error = err;
      console.warn(
        `Intento ${i + 1} fallido al buscar disponibilidades:`,
        err.message
      );
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw error;
}

// Endpoint GET para obtener información básica
router.get("/", async (req, res) => {
  try {
    res.json({
      message: "Endpoint de disponibilidades activo",
      methods: ["GET", "POST"],
      usage: {
        GET: "Información básica del endpoint",
        POST: "Buscar disponibilidades con parámetros en el body",
      },
    });
  } catch (err) {
    console.error("Error en GET availabilities:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint POST para buscar disponibilidades
router.post("/", async (req, res) => {
  try {
    const params = req.body;
    if (!params || Object.keys(params).length === 0) {
      return res
        .status(400)
        .json({
          error:
            "Se requieren parámetros en el body para buscar disponibilidades",
        });
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    //Marcar fechas que se muestran
    const pad = (n) => n.toString().padStart(2, "0");
    const fechaInicio = `${pad(today.getDate())}/${pad(
      today.getMonth() + 1
    )}/${today.getFullYear()}`;
    const fechaFin = `${pad(thirtyDaysFromNow.getDate())}/${pad(
      thirtyDaysFromNow.getMonth() + 1
    )}/${thirtyDaysFromNow.getFullYear()}`;

    const paramsWithDates = {
      ...params,
      AVA_START_DAY: params.AVA_START_DAY || fechaInicio,
      AVA_END_DAY: params.AVA_END_DAY || fechaFin,
    };

    console.log(
      "Intentando obtener disponibilidades desde:",
      paramsWithDates.AVA_START_DAY,
      "hasta:",
      paramsWithDates.AVA_END_DAY
    );

    // --- REINTENTO ---
    const results = await retryPromise(
      () => getAvailabilities(paramsWithDates),
      3,
      900
    );

    res.json(results);
  } catch (err) {
    console.error(
      "Error obteniendo disponibilidades tras varios intentos:",
      err.message,
      err.response?.data || ""
    );
    res
      .status(500)
      .json({
        error:
          "No se pudo obtener el calendario de disponibilidad después de varios intentos",
      });
  }
});

module.exports = router;
