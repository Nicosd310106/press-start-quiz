// api/generar.js - Servidor ultraseguro y compatible con Vercel
module.exports = async function handler(req, res) {
  // Manejo de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Banco de preguntas locales 100% garantizado
  const PREGUNTAS_RESPALDO = {
    "RPG": [
      { q: "¿Cuál es el personaje principal de Final Fantasy VII?", options: ["Cloud Strife", "Squall Leonhart", "Zidane Tribal", "Tidus"], correct: 0, dificultad: "Fácil" },
      { q: "¿En qué año se lanzó The Witcher 3: Wild Hunt?", options: ["2015", "2013", "2016", "2014"], correct: 0, dificultad: "Media" },
      { q: "¿Qué estudio desarrolló la saga Dark Souls?", options: ["FromSoftware", "Capcom", "Square Enix", "Bethesda"], correct: 0, dificultad: "Fácil" },
      { q: "¿Cómo se llama el reino principal en The Legend of Zelda?", options: ["Hyrule", "Kanto", "Novigrad", "Lordaeron"], correct: 0, dificultad: "Fácil" }
    ],
    "Survival Horror": [
      { q: "¿Cómo se llama la ciudad infectada en Resident Evil 2?", options: ["Raccoon City", "Silent Hill", "Bright Falls", "Rapture"], correct: 0, dificultad: "Fácil" },
      { q: "¿Qué objeto usas para guardar la partida en Resident Evil clásico?", options: ["Cinta de tinta", "Pila", "Botiquín", "Inyección"], correct: 0, dificultad: "Fácil" }
    ],
    "Acción y Aventura": [
      { q: "¿Cómo se llama el protagonista de The Legend of Zelda?", options: ["Link", "Zelda", "Ganon", "Epona"], correct: 0, dificultad: "Fácil" }
    ]
  };

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    let genre = 'RPG';

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }
      if (body && body.genre) {
        genre = body.genre;
      }
    }

    // Intentar conectar con Gemini si existe la API KEY
    if (GEMINI_API_KEY) {
      try {
        const promptText = `Genera un JSON con 5 preguntas sobre videojuegos del genero "${genre}".
Responde SOLO con un arreglo JSON valido con esta estructura exacta sin bloques de codigo ni markdown:
[
  {
    "q": "¿Pregunta?",
    "options": ["Opcion A", "Opcion B", "Opcion C", "Opcion D"],
    "correct": 0,
    "dificultad": "Facil"
  }
]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return res.status(200).json(parsed);
          }
        }
      } catch (geminiError) {
        console.error('Error con Gemini:', geminiError);
      }
    }

    // Respuesta de respaldo si falla Gemini o no hay API KEY
    const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
    return res.status(200).json(respaldo);

  } catch (error) {
    console.error('Error fatal:', error);
    // En lugar de arrojar error 500, siempre devuelve preguntas locales
    const respaldo = PREGUNTAS_RESPALDO["RPG"];
    return res.status(200).json(respaldo);
  }
};