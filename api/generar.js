import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-pro';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export default async function handler(req, res) {
  // CORS abierto
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ruta de diagnóstico rápida
  if (req.method === 'GET' && req.query.diagnostico === '1') {
    let supabaseStatus = 'No configurado';
    if (supabase) {
      const { data, error } = await supabase.from('preguntas').select('id').limit(1);
      supabaseStatus = error ? `Error: ${error.message}` : 'Conectado y funcional';
    }
    return res.status(200).json({
      status: 'OK',
      gemini_key_present: !!GEMINI_API_KEY,
      gemini_model: GEMINI_MODEL,
      supabase: supabaseStatus
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { genre = 'RPG', level = 'Media', count = 5, evitar = [] } = req.body || {};
  const requestedCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 15);

  // 1. Intentar responder desde Supabase primero si existe suficiente stock
  if (supabase) {
    try {
      let query = supabase
        .from('preguntas')
        .select('*')
        .eq('genero', genre);

      if (level !== 'Todas') {
        query = query.eq('dificultad', level);
      }

      const { data: dbQuestions, error } = await query.limit(50);

      if (!error && dbQuestions && dbQuestions.length >= requestedCount) {
        // Filtrar las que no estén en la lista de evitar
        const disponibles = dbQuestions.filter(q => !evitar.includes(q.pregunta));
        if (disponibles.length >= requestedCount) {
          // Mezclar y tomar la cantidad pedida
          const seleccionadas = disponibles
            .sort(() => 0.5 - Math.random())
            .slice(0, requestedCount)
            .map(q => ({
              q: q.pregunta,
              options: q.opciones,
              correct: q.correcta,
              dificultad: q.dificultad
            }));

          res.setHeader('X-Fuente', 'banco');
          res.setHeader('X-Banco', 'guardadas');
          return res.status(200).json(seleccionadas);
        }
      }
    } catch (dbErr) {
      console.warn('Error leyendo de Supabase, recurriendo a Gemini:', dbErr);
    }
  }

  // 2. Generar con Gemini IA (reducido a lotes de 5 por defecto)
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta la API Key de Gemini en las variables de entorno.' });
  }

  const promptText = `Genera un arreglo JSON estricto con ${requestedCount} preguntas de trivia sobre videojuegos.
Género: "${genre}"
Dificultad: "${level === 'Todas' ? 'Mezcla aleatoria entre Fácil, Media y Difícil' : level}"
Evita estas preguntas ya usadas: ${JSON.stringify(evitar.slice(-30))}

Reglas estrictas:
1. Devuelve SOLAMENTE un arreglo JSON con objetos con este formato exacto:
[
  {
    "q": "¿Pregunta sobre el juego?",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correct": 0,
    "dificultad": "${level === 'Todas' ? 'Media' : level}"
  }
]
2. "correct" es el índice numérico (0 a 3) de la opción correcta.
3. Las opciones deben venir mezcladas.
4. Todo el texto en español. No agregues etiquetas markdown de código ni texto adicional.`;

  try {
    const questionsFromIA = await consultarGeminiConFallback(promptText);

    // Guardar asíncronamente en Supabase en segundo plano para consumo futuro
    if (supabase && Array.isArray(questionsFromIA) && questionsFromIA.length > 0) {
      guardarEnSupabase(questionsFromIA, genre);
    }

    res.setHeader('X-Fuente', 'ia');
    res.setHeader('X-Banco', 'guardado-iniciado');
    return res.status(200).json(questionsFromIA);

  } catch (err) {
    console.error('Error al generar preguntas con Gemini:', err);
    return res.status(500).json({ 
      error: 'Error al generar preguntas con la IA', 
      detalle: err.message 
    });
  }
}

async function consultarGeminiConFallback(prompt) {
  const modelos = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];

  for (const modelo of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        continue; // Probar con el siguiente modelo si este falla
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Falló modelo ${modelo}, intentando respaldo...`);
    }
  }

  throw new Error('Todos los modelos de Gemini fallaron o agotaron cuota.');
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
    console.warn('Error guardando en banco Supabase:', err);
  }
}