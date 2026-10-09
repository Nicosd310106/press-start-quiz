// Modelo por defecto; puedes cambiarlo sin tocar código con la variable GEMINI_MODEL en Vercel
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Opcional: modelo alternativo si el principal está saturado (variable GEMINI_FALLBACK_MODEL en Vercel)
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";

const DIFICULTADES = {
  "Fácil": "FÁCIL: juegos y datos muy conocidos por cualquier persona que haya jugado alguna vez.",
  "Media": "MEDIA: requiere haber jugado el juego; detalles de historia, personajes, mecánicas y fechas.",
  "Difícil": "DIFÍCIL: nivel veterano; lore profundo, datos de desarrollo, motores, lenguajes de programación, trucos técnicos y curiosidades poco conocidas.",
  "Todas": "MEZCLADA: combina preguntas fáciles, medias y difíciles en orden aleatorio (no las ordenes por dificultad)."
};

function validar(preguntas) {
  if (!Array.isArray(preguntas)) return [];
  return preguntas.filter(p =>
    p && typeof p.q === "string" &&
    Array.isArray(p.options) && p.options.length === 4 &&
    p.options.every(o => typeof o === "string" && o.trim()) &&
    new Set(p.options).size === 4 &&
    Number.isInteger(p.correct) && p.correct >= 0 && p.correct <= 3
  );
}

// Mezcla las opciones para que la correcta no caiga siempre en la misma posición
function mezclarOpciones(p) {
  const correcta = p.options[p.correct];
  const opts = [...p.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { q: p.q.trim(), options: opts, correct: opts.indexOf(correcta) };
}

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta GEMINI_API_KEY en Vercel" });

  const prompt = `Eres un experto en videojuegos. Genera ${count} preguntas de trivia de opción múltiple en español sobre el género "${genre}".
Dificultad: ${DIFICULTADES[level]}
Reglas:
- Cada pregunta tiene exactamente 4 opciones distintas y solo 1 correcta.
- Varía los juegos, épocas (retro y modernos) y consolas; no repitas el mismo juego más de 2 veces.
- Solo datos verídicos y verificables; si dudas de un dato, usa otra pregunta.
- "correct" es el índice (0 a 3) de la opción correcta.
${evitar.length ? `- NO repitas ni parafrasees estas preguntas ya usadas:\n${evitar.map(q => "  * " + q).join("\n")}` : ""}
Semilla de variedad: ${Math.random().toString(36).slice(2, 8)}
Devuelve SOLO un arreglo JSON con esta forma:
[{"q":"...","options":["...","...","...","..."],"correct":0}]`;

  const espera = ms => new Promise(r => setTimeout(r, ms));
  const TEMPORALES = [429, 500, 503, 504];
  // Intentos: modelo principal 2 veces y luego el de respaldo (si lo defines en Vercel)
  const intentos = [MODEL, MODEL, FALLBACK_MODEL].filter(Boolean);

  try {
    let data = null;
    let ultimoError = "Error al conectar con la API de Google";

    for (let i = 0; i < intentos.length; i++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${intentos[i]}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 1.0 }
        })
      });
      const json = await response.json();

      if (response.ok) { data = json; break; }

      ultimoError = response.status === 429
        ? "Se agotó el límite gratuito de la IA por ahora. Intenta de nuevo más tarde."
        : (json.error?.message || ultimoError);

      // Con cuota agotada (429) no sirve reintentar el mismo modelo: pasa directo al de respaldo
      if (response.status === 429) {
        while (i + 1 < intentos.length && intentos[i + 1] === intentos[i]) i++;
      }
      // Solo reintenta con errores temporales (sobrecarga, límite)
      if (!TEMPORALES.includes(response.status) || i === intentos.length - 1) break;
      if (response.status !== 429) await espera(1200);
    }

    if (!data) throw new Error(ultimoError);

    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    const limpio = raw.replace(/```json|```/g, "").trim();
    const preguntas = validar(JSON.parse(limpio)).map(mezclarOpciones);

    if (preguntas.length === 0) throw new Error("La IA no devolvió preguntas válidas, intenta de nuevo.");
    return res.status(200).json(preguntas);
  } catch (error) {
    console.error("Error en la API:", error);
    return res.status(500).json({ error: "Error al generar preguntas con la IA", detalle: error.message });
  }
}
