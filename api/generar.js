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
