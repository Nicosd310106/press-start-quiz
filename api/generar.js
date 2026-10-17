const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Banco de preguntas de respaldo estático (Garantiza que NUNCA tire error 500)
const PREGUNTAS_RESPALDO = {
  "RPG": [
    { q: "¿Cuál es el personaje principal de Final Fantasy VII?", options: ["Cloud Strife", "Squall Leonhart", "Zidane Tribal", "Tidus"], correct: 0, dificultad: "Fácil" },
    { q: "¿En qué año se lanzó The Witcher 3: Wild Hunt?", options: ["2015", "2013", "2016", "2014"], correct: 0, dificultad: "Media" },
    { q: "¿Cuál es la clase principal que usa magia en la saga Souls?", options: ["Hechicero", "Guerrero", "Cazador", "Bandido"], correct: 0, dificultad: "Fácil" }
  ],
  "Survival Horror": [
    { q: "¿Cómo se llama la ciudad infectada en Resident Evil 2?", options: ["Raccoon City", "Silent Hill", "Bright Falls", "Rapture"], correct: 0, dificultad: "Fácil" },
    { q: "¿Qué objeto usas para guardar la partida en Resident Evil clásico?", options: ["Cinta de tinta", "Pila", "Botiquín", "Inyección"], correct: 0, dificultad: "Fácil" }
  ],
  "Acción y Aventura": [
    { q: "¿Cómo se llama el protagonista de The Legend of Zelda?", options: ["Link", "Zelda", "Ganon", "Epona"], correct: 0, dificultad: "Fácil" }
  ]
};

module.exports = async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Endpoint de diagnóstico para verificar desde el navegador
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'OK',
      gemini_key_present: !!GEMINI_API_KEY
    });
  }

  const { genre = 'RPG', level = 'Todas', count = 5, evitar = [] } = req.body || {};
  const requestedCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);

  // Intento de consulta a la API de Gemini
  if (GEMINI_API_KEY) {
    try {
      const promptText = `Genera un arreglo JSON estricto con ${requestedCount} preguntas de trivia sobre videojuegos del género "${genre}".
Dificultad: "${level === 'Todas' || level === 'Infinito' ? 'Mezcla aleatoria' : level}"
Evita repetir estas preguntas: ${JSON.stringify(evitar.slice(-20))}

Responde ÚNICAMENTE con este JSON sin markdown ni explicaciones:
[
  {
    "q": "¿Pregunta sobre el juego?",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correct": 0,
    "dificultad": "Media"
  }
]`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
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
          return res.status(200).json(parsed);
        }
      }
    } catch (iaErr) {
      console.error('Error invocando Gemini:', iaErr);
    }
  }

  // Si Gemini falla o no hay clave, responde con el banco local seguro (Evita el Error 500)
  const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
  return res.status(200).json(respaldo);
};