import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  } catch (err) {
    console.error('Error inicializando Supabase:', err);
  }
}

// Banco de preguntas de emergencia locales si falla Gemini o no hay cuota
const PREGUNTAS_RESPALDO = {
  "RPG": [
    { q: "¿Cuál es el personaje principal de Final Fantasy VII?", options: ["Cloud Strife", "Squall Leonhart", "Zidane Tribal", "Tidus"], correct: 0, dificultad: "Fácil" },
    { q: "¿En qué año se lanzó The Witcher 3: Wild Hunt?", options: ["2015", "2013", "2016", "2014"], correct: 0, dificultad: "Media" }
  ],
  "Survival Horror": [
    { q: "¿Cómo se llama la ciudad infectada en Resident Evil 2?", options: ["Raccoon City", "Silent Hill", "Bright Falls", "Rapture"], correct: 0, dificultad: "Fácil" },
    { q: "¿Qué objeto usas para guardar la partida en Resident Evil clásico?", options: ["Cinta de tinta", "Pila", "Botiquín", "Inyección"], correct: 0, dificultad: "Fácil" }
  ]
};

export default async function handler(req, res) {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Endpoint de Diagnóstico para probar la API desde el navegador (GET /api/generar?diagnostico=1)
  if (req.method === 'GET' && req.query.diagnostico === '1') {
    return res.status(200).json({
      status: 'OK',
      gemini_key_present: !!GEMINI_API_KEY,
      gemini_model: GEMINI_MODEL,
      supabase_present: !!supabase
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { genre = 'RPG', level = 'Todas', count = 5, evitar = [] } = req.body || {};
  const requestedCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);

  // 1. Intentar consultar preguntas de Supabase
  if (supabase) {
    try {
      let query = supabase.from('preguntas').select('*').eq('genero', genre);
      if (level !== 'Todas' && level !== 'Infinito') {
        query = query.eq('dificultad', level);
      }
      const { data: dbQuestions, error } = await query.limit(30);

      if (!error && dbQuestions && dbQuestions.length >= requestedCount) {
        const disponibles = dbQuestions.filter(q => !evitar.includes(q.pregunta));
        if (disponibles.length >= requestedCount) {
          const seleccionadas = disponibles
            .sort(() => 0.5 - Math.random())
            .slice(0, requestedCount)
            .map(q => ({
              q: q.pregunta,
              options: q.opciones,
              correct: q.correcta,
              dificultad: q.dificultad
            }));
          return res.status(200).json(seleccionadas);
        }
      }
    } catch (dbErr) {
      console.warn('Error leyendo de Supabase:', dbErr);
    }
  }

  // 2. Intentar consultar Gemini IA
  if (GEMINI_API_KEY) {
    try {
      const promptText = `Genera un arreglo JSON estricto con ${requestedCount} preguntas de trivia sobre videojuegos del género "${genre}".
Dificultad: "${level === 'Todas' || level === 'Infinito' ? 'Mezcla aleatoria' : level}"
Evita repetir estas preguntas: ${JSON.stringify(evitar.slice(-20))}

Responde ÚNICAMENTE con este JSON sin markdown:
[
  {
    "q": "¿Pregunta sobre el juego?",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correct": 0,
    "dificultad": "Media"
  }
]`;

      const url = `[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.7 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Intentar guardar en Supabase en segundo plano sin congelar la respuesta
          if (supabase) {
            guardarEnSupabase(parsed, genre);
          }
          return res.status(200).json(parsed);
        }
      }
    } catch (iaErr) {
      console.error('Error llamando a Gemini:', iaErr);
    }
  }

  // 3. Fallback de emergencia si fallan la IA y Supabase
  const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
  return res.status(200).json(respaldo);
}

async function guardarEnSupabase(preguntas, genero) {
  try {
    const filas = preguntas.map(p => ({
      genero: genero,
      dificultad: p.dificultad || 'Media',
      pregunta: p.q,
      opciones: p.options,
      correcta: p.correct
    }));
    await supabase.from('preguntas').insert(filas);
  } catch (err) {
    console.warn('Error guardando en Supabase:', err);
  }
}