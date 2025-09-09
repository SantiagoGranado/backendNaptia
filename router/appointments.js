// routes/appointments.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Si este require funciona en tu estructura actual, lo dejamos así.
// (Si más adelante pones SALUS_DRY_RUN=false y falla la ruta, ajusta el path)
const { initializeHost, createAppointment, getPatients } = require('../salusApi');

// ==================== CONFIG / DRY-RUN ====================
const SALUS_DRY_RUN  = process.env.SALUS_DRY_RUN  !== 'false' && process.env.SALUS_DRY_RUN  !== '0';
const BITRIX_DRY_RUN = process.env.BITRIX_DRY_RUN !== 'false' && process.env.BITRIX_DRY_RUN !== '0';

const BITRIX_WEBHOOK_BASE = (process.env.BITRIX_WEBHOOK || '').replace(/\/$/, '');
const BITRIX_CATEGORY_ID  = parseInt(process.env.BITRIX_CATEGORY_ID || '128', 10);

// ====== UF de Bitrix (lee de .env y, si no, usa fallback con tus IDs) ======
const UF_PATIENT_NAME       = process.env.BITRIX_UF_PATIENT_NAME       || 'UF_CRM_1689862730';
const UF_PATIENT_EMAIL      = process.env.BITRIX_UF_PATIENT_EMAIL      || 'UF_CRM_1757402187436';
const UF_PATIENT_PHONE      = process.env.BITRIX_UF_PATIENT_PHONE      || 'UF_CRM_1757402264694';
const UF_PATIENT_IDDOC      = process.env.BITRIX_UF_PATIENT_IDDOC      || 'UF_CRM_1757403457103';
const UF_SPECIALTY_NAME     = process.env.BITRIX_UF_SPECIALTY_NAME     || 'UF_CRM_1757403589957';
const UF_PATIENT_GENDER     = process.env.BITRIX_UF_PATIENT_GENDER     || 'UF_CRM_1757403346782';
const UF_APPOINTMENT_DATE   = process.env.BITRIX_UF_APPOINTMENT_DATE   || 'UF_CRM_1757403419326';
const UF_INSURANCE_NAME     = process.env.BITRIX_UF_INSURANCE_NAME     || 'UF_CRM_1757407718320'; // << NUEVO

// ====== Valores de la lista "Sexo" en Bitrix ======
// Hombre=3748, Mujer=3750, Otro=3752
const GENDER_MAP = { M: 3748, F: 3750, O: 3752 };

// ==================== HELPERS ====================
function toDDMMYYYY(value) {
  if (!value) return value;
  const v = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;

  let m = v.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;

  m = v.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  return v;
}

function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

function getSpecialtyText(p) {
  // Título: "Nombre Apellidos - especialidad"
  return (
    p.SPECIALTY_NAME ||
    p.ACTIVITY_GROUP_NAME ||
    p.ESPECIALIDAD_NOMBRE ||
    p.SPECIALTY ||
    p.ACTIVITY_GROUP_LID || // fallback al id si no hay nombre
    'Especialidad'
  );
}

// ==================== BITRIX ====================
function buildBitrixDealFields(p) {
  const patientName = `${(p.USER_FIRST_NAME || '').trim()} ${(p.USER_SECOND_NAME || '').trim()}`
    .replace(/\s+/g, ' ')
    .trim();

  const specialtyText = String(getSpecialtyText(p)).trim();
  const title = `${patientName} - ${specialtyText}`;

  // Fecha de la cita: usa APP_DATE si llega (normalizada a dd/mm/yyyy)
  const appointmentDate = p.APP_DATE ? toDDMMYYYY(p.APP_DATE) : undefined;
  // Sexo: M/F/O -> IDs de lista en Bitrix
  const genderValue = (p.USER_GENDER && GENDER_MAP[p.USER_GENDER]) || undefined;

  const base = compact({
    TITLE: title,
    CATEGORY_ID: BITRIX_CATEGORY_ID,
    CURRENCY_ID: 'EUR',
  });

  const custom = {};
  if (patientName)                custom[UF_PATIENT_NAME]     = patientName;                       // Nombre y apellidos
  if (p.USER_EMAIL)               custom[UF_PATIENT_EMAIL]    = String(p.USER_EMAIL).trim();       // Email
  if (p.USER_MOBILE_PHONE)        custom[UF_PATIENT_PHONE]    = String(p.USER_MOBILE_PHONE).trim();// Teléfono
  if (p.USER_ID_NUMBER)           custom[UF_PATIENT_IDDOC]    = String(p.USER_ID_NUMBER).trim();   // DNI
  if (specialtyText)              custom[UF_SPECIALTY_NAME]   = specialtyText;                     // Especialidad (texto si viene)
  if (genderValue)                custom[UF_PATIENT_GENDER]   = genderValue;                       // Sexo (lista)
  if (appointmentDate)            custom[UF_APPOINTMENT_DATE] = appointmentDate;                   // Fecha cita
  if (p.INSURANCE_NAME)           custom[UF_INSURANCE_NAME]   = String(p.INSURANCE_NAME).trim();   // Aseguradora (texto) << NUEVO

  return { ...base, ...custom };
}

async function createBitrixDeal(fields) {
  if (!BITRIX_WEBHOOK_BASE) {
    throw new Error('BITRIX_WEBHOOK no definido en el entorno');
  }
  const endpoint = `${BITRIX_WEBHOOK_BASE}/crm.deal.add.json`;
  const { data } = await axios.post(endpoint, { fields }, { timeout: 8000 });
  if (data && data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data?.result; // dealId
}

// ==================== SALUS ====================
async function createSalusAppointment(crearCita) {
  await initializeHost();

  const {
    USER_FIRST_NAME,
    USER_SECOND_NAME,
    USER_DATE_OF_BIRTH,
  } = crearCita;

  const DOB_NORM = toDDMMYYYY(USER_DATE_OF_BIRTH);

  const patients = await getPatients({
    USER_FIRST_NAME,
    USER_SECOND_NAME,
    USER_DATE_OF_BIRTH: DOB_NORM,
  });
  const USER_LID = patients?.[0]?.USER_LID;

  const citaPayload = {
    ...crearCita,
    USER_DATE_OF_BIRTH: DOB_NORM,
    ...(USER_LID ? { USER_LID } : {}),
  };

  const result = await createAppointment(citaPayload);
  return result;
}

// ==================== MIDDLEWARE ====================
// Si quieres permitir pruebas solo-Bitrix aunque falte algo de Salus,
// puedes relajar aquí cuando SALUS_DRY_RUN sea true.
// Ahora lo dejo "estricto" porque tu front ya envía todo.
function validateAppointment(req, res, next) {
  const required = [
    'USER_FIRST_NAME',
    'USER_SECOND_NAME',
    'USER_DATE_OF_BIRTH',
    'APP_DATE',
    'APP_START_TIME',
    'RESOURCE_LID',
    'ACTIVITY_LID',
  ];
  const missing = required.filter((k) => !req.body[k]);
  if (missing.length) {
    return res.status(400).json({ ok: false, error: `Faltan campos: ${missing.join(', ')}` });
  }
  next();
}

// ==================== RUTAS ====================
router.post('/create', validateAppointment, async (req, res) => {
  try {
    // Normaliza DOB a dd/mm/yyyy para todo el proceso
    const payload = {
      ...req.body,
      ...(req.body.USER_DATE_OF_BIRTH
        ? { USER_DATE_OF_BIRTH: toDDMMYYYY(req.body.USER_DATE_OF_BIRTH) }
        : {}),
    };

    // ----- LOG -----
    console.log('================= [APPOINTMENTS][CREATE] =================');
    console.log('SALUS_DRY_RUN :', SALUS_DRY_RUN);
    console.log('BITRIX_DRY_RUN:', BITRIX_DRY_RUN);
    console.log('[Payload normalizado]:');
    console.dir(payload, { depth: null });

    // ----- Bitrix: prepara fields (con todos los UF) -----
    const bitrixFields = buildBitrixDealFields(payload);
    console.log('[Bitrix fields preparados]:');
    console.dir(bitrixFields, { depth: null });
    console.log('==========================================================');

    // === CASO 1: NO ENVIAR A SALUS (DRY-RUN), PERO SÍ A BITRIX ===
    if (SALUS_DRY_RUN) {
      let bitrixPreview = { dryRun: true, sent: false, dealId: null, error: null };

      if (!BITRIX_DRY_RUN && BITRIX_WEBHOOK_BASE) {
        try {
          const dealId = await createBitrixDeal(bitrixFields);
          bitrixPreview = { dryRun: false, sent: true, dealId, error: null };
        } catch (e) {
          bitrixPreview = { dryRun: false, sent: false, dealId: null, error: e.message };
        }
      }

      // ok = true si el deal de Bitrix se ha creado en este modo
      const okIfBitrixSent = !BITRIX_DRY_RUN && bitrixPreview.sent === true;

      return res.json({
        ok: okIfBitrixSent,
        dryRun: true,
        message: 'DRY-RUN: No se ha creado la cita en Salus.',
        payload,
        bitrix: {
          enabled: Boolean(BITRIX_WEBHOOK_BASE),
          category: BITRIX_CATEGORY_ID,
          dryRun: BITRIX_DRY_RUN,
          preview: bitrixPreview,
          fields: bitrixFields,
        },
      });
    }

    // === CASO 2: ENVÍO REAL A SALUS ===
    // 1) Crea cita en Salus
    const appointment = await createSalusAppointment(payload);

    // 2) Crea deal en Bitrix (no bloquea la respuesta si falla)
    let bitrix = { enabled: Boolean(BITRIX_WEBHOOK_BASE), dryRun: BITRIX_DRY_RUN };
    if (BITRIX_WEBHOOK_BASE) {
      if (BITRIX_DRY_RUN) {
        bitrix = { ...bitrix, sent: false, fields: bitrixFields, note: 'DRY-RUN activo. No se envió a Bitrix.' };
      } else {
        try {
          const dealId = await createBitrixDeal(bitrixFields);
          bitrix = { ...bitrix, sent: true, dealId };
        } catch (e) {
          console.error('❌ Error creando deal en Bitrix:', e.message);
          bitrix = { ...bitrix, sent: false, error: e.message };
        }
      }
    } else {
      bitrix = { ...bitrix, sent: false, error: 'BITRIX_WEBHOOK no configurado' };
    }

    return res.json({ ok: true, appointment, bitrix });

  } catch (err) {
    console.error('❌ Error al crear cita:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
