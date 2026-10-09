import { createHash } from "node:crypto";

// ---------- Configuración (todo se puede cambiar desde variables de Vercel) ----------
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const BANCO_ACTIVO = Boolean(SUPABASE_URL && SUPABASE_KEY);
// Si el banco tiene al menos esta cantidad de preguntas, se usa a menudo en vez de gastar cuota de la IA
const BANCO_MIN = parseInt(process.env.BANCO_MIN) || 40;

const NIVELES = ["Fácil", "Media", "Difícil"];
const DIFICULTADES = {
  "Fácil": "FÁCIL: juegos y datos muy conocidos por cualquier persona que haya jugado alguna vez.",
  "Media": "MEDIA: requiere haber jugado el juego; detalles de historia, personajes, mecánicas y fechas.",
  "Difícil": "DIFÍCIL: nivel veterano; lore profundo, datos de desarrollo, motores, lenguajes de programación, trucos técnicos y curiosidades poco conocidas.",
  "Todas": "MEZCLADA: combina preguntas fáciles, medias y difíciles en orden aleatorio (no las ordenes por dificultad)."
};

// ---------- Utilidades ----------
function mezclar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizar(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function hashPregunta(genre, q) {
  return createHash("sha1").update(`${genre}|${normalizar(q)}`).digest("hex");
}

function validar(preguntas) {
  if (!Array.isArray(preguntas)) return [];
  return preguntas.filter(p =>
    p && typeof p.q === "string" && p.q.trim() &&
    Array.isArray(p.options) && p.options.length === 4 &&
    p.options.every(o => typeof o === "string" && o.trim()) &&
    new Set(p.options).size === 4 &&
    Number.isInteger(p.correct) && p.correct >= 0 && p.correct <= 3
  );
}

// Mezcla las opciones para que la correcta no caiga siempre en la misma posición
function mezclarOpciones(p, nivelPedido) {
  const correcta = p.options[p.correct];
  const opts = mezclar(p.options);
  let dificultad = nivelPedido;
  if (nivelPedido === "Todas") dificultad = NIVELES.includes(p.dificultad) ? p.dificultad : "Media";
  return { q: p.q.trim(), options: opts, correct: opts.indexOf(correcta), dificultad };
}

// ---------- Banco de preguntas (Supabase) ----------
async function sb(ruta, opciones = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: SUPABASE_KEY,
      // Las claves nuevas (sb_secret_...) NO son JWT y solo van en "apikey"; las antiguas (service_role, eyJ...) usan ambas
      ...(SUPABASE_KEY.startsWith("sb_") ? {} : { Authorization: `Bearer ${SUPABASE_KEY}` }),
      "Content-Type": "application/json",
      ...(opciones.headers || {})
    },
    signal: AbortSignal.timeout(5000)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return r;
}

async function leerBanco(genre, level, evitarNorm) {
  if (!BANCO_ACTIVO) return [];
  try {
    let ruta = `preguntas?select=q,options,correct,dificultad&genero=eq.${encodeURIComponent(genre)}&limit=300`;
    if (level !== "Todas") ruta += `&dificultad=eq.${encodeURIComponent(level)}`;
    const filas = await (await sb(ruta)).json();
    const validas = validar(filas).filter(f => !evitarNorm.has(normalizar(f.q)));
    return mezclar(validas).map(f => mezclarOpciones(f, level === "Todas" ? "Todas" : level));
  } catch (e) {
    console.error("Banco (leer):", e.message);
    return [];
  }
}

async function guardarBanco(genre, preguntas) {
  if (!BANCO_ACTIVO || !preguntas.length) return;
  try {
    const filas = preguntas.map(p => ({
      genero: genre,
      dificultad: p.dificultad,
      q: p.q,
      options: p.options,
      correct: p.correct,
      hash: hashPregunta(genre, p.q)
    }));
    await sb("preguntas?on_conflict=hash", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(filas)
    });
  } catch (e) {
    console.error("Banco (guardar):", e.message); // un fallo aquí no debe romper el juego
  }
}

// ---------- IA (Gemini) ----------
const TEMPORALES = [429, 500, 503, 504];
const espera = ms => new Promise(r => setTimeout(r, ms));

async function generarConIA({ genre, level, count, evitar, apiKey }) {
  const prompt = `Eres un experto en videojuegos. Genera ${count} preguntas de trivia de opción múltiple en español sobre el género "${genre}".
Dificultad: ${DIFICULTADES[level]}
Reglas:
- Cada pregunta tiene exactamente 4 opciones distintas y solo 1 correcta.
- Varía los juegos, épocas (retro y modernos) y consolas; no repitas el mismo juego más de 2 veces.
- Solo datos verídicos y verificables; si dudas de un dato, usa otra pregunta.
- "correct" es el índice (0 a 3) de la opción correcta.
- "dificultad" es el nivel real de esa pregunta: "Fácil", "Media" o "Difícil".
${evitar.length ? `- NO repitas ni parafrasees estas preguntas ya usadas:\n${evitar.map(q => "  * " + q).join("\n")}` : ""}
Semilla de variedad: ${Math.random().toString(36).slice(2, 8)}
Devuelve SOLO un arreglo JSON con esta forma:
[{"q":"...","options":["...","...","...","..."],"correct":0,"dificultad":"Fácil"}]`;

  // Modelo principal 2 veces y luego el de respaldo (si existe)
  const intentos = [MODEL, MODEL, FALLBACK_MODEL].filter(Boolean);
  const inicio = Date.now();
  let data = null;
  let ultimoError = "Error al conectar con la API de Google";

  for (let i = 0; i < intentos.length; i++) {
    if (i > 0 && Date.now() - inicio > 38000) break; // no pasarse del tiempo máximo de la función

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${intentos[i]}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 1.0,
            // En los modelos 3.x el "pensamiento" por defecto es lento; en bajo responde mucho antes
            ...(intentos[i].startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {})
          }
        }),
        signal: AbortSignal.timeout(22000) // si Gemini no responde en 22 s, se corta ese intento
      });
      const json = await response.json();

      if (response.ok) { data = json; break; }

      ultimoError = response.status === 429
        ? "Se agotó el límite gratuito de la IA por ahora. Intenta de nuevo más tarde."
        : (json.error?.message || ultimoError);

      // Con cuota agotada (429) no sirve reintentar el mismo modelo: pasa al de respaldo
      if (response.status === 429) {
        while (i + 1 < intentos.length && intentos[i + 1] === intentos[i]) i++;
      }
      if (!TEMPORALES.includes(response.status) || i === intentos.length - 1) break;
      if (response.status !== 429) await espera(1200);
    } catch (e) {
      const agotado = e.name === "TimeoutError" || e.name === "AbortError";
      ultimoError = agotado
        ? "La IA tardó demasiado en responder."
        : `No se pudo conectar con la IA: ${e.message}`;
      console.error("Intento con", intentos[i], "falló:", e.name, e.message);
      // Si un modelo se colgó, repetirlo no ayuda: pasa directo al siguiente modelo distinto
      while (i + 1 < intentos.length && intentos[i + 1] === intentos[i]) i++;
      if (i === intentos.length - 1) break;
    }
  }

  if (!data) throw new Error(ultimoError);

  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  const limpio = raw.replace(/```json|```/g, "").trim();
  const preguntas = validar(JSON.parse(limpio)).map(p => mezclarOpciones(p, level));
  if (preguntas.length === 0) throw new Error("La IA no devolvió preguntas válidas, intenta de nuevo.");
  return preguntas;
}

// ---------- Handler ----------
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // luego limítalo a tu dominio
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const genre = String(body?.genre || "General").slice(0, 60);
  const level = DIFICULTADES[body?.level] ? body.level : "Todas";
  const count = Math.min(Math.max(parseInt(body?.count) || 10, 1), 15);
  const evitar = Array.isArray(body?.evitar) ? body.evitar.slice(-40).map(s => String(s).slice(0, 120)) : [];
  const evitarNorm = new Set(evitar.map(normalizar));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta GEMINI_API_KEY en Vercel" });

  const enviar = (lista, fuente) => {
    res.setHeader("X-Fuente", fuente); // "ia" o "banco", útil para depurar
    return res.status(200).json(lista);
  };

  // 1) Si el banco ya es grande, se usa seguido para ahorrar peticiones de la IA
  const banco = await leerBanco(genre, level, evitarNorm);
  if (banco.length >= BANCO_MIN && Math.random() < 0.7) {
    return enviar(banco.slice(0, count), "banco");
  }

  // 2) Se intenta con la IA y lo nuevo se guarda en el banco
  try {
    const preguntas = await generarConIA({ genre, level, count, evitar, apiKey });
    await guardarBanco(genre, preguntas);
    return enviar(preguntas, "ia");
  } catch (error) {
    console.error("Error en la IA:", error.message);

    // 3) Si la IA falla (cuota, saturación, tiempo), se responde con lo guardado
    if (banco.length > 0) return enviar(banco.slice(0, count), "banco");

    return res.status(500).json({ error: "Error al generar preguntas con la IA", detalle: error.message });
  }
}
