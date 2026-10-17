const https = require('https');

module.exports = async function handler(req, res) {
  // Manejo estricto de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Banco local de respaldo 100% libre de fallos
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

  let genre = 'RPG';

  try {
    if (req.body) {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      if (body && body.genre) {
        genre = body.genre;
      }
    }
  } catch (e) {
    console.error('Error parseando body:', e);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
    return res.status(200).json(respaldo);
  }

  // Función para consultar a la API de Gemini usando https nativo de Node.js
  function pedirAGemini() {
    return new Promise((resolve) => {
      const promptText = `Genera un JSON con 5 preguntas sobre videojuegos del genero "${genre}". Responde SOLO con un arreglo JSON valido con esta estructura exacta sin bloques de codigo ni markdown: [{"q":"¿Pregunta?","options":["A","B","C","D"],"correct":0,"dificultad":"Facil"}]`;

      const postData = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 7000
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              const json = JSON.parse(data);
              const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanText);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return resolve(parsed);
              }
            }
          } catch (err) {
            console.error('Error parseando JSON de Gemini:', err);
          }
          resolve(null);
        });
      });

      request.on('error', (err) => {
        console.error('Error en peticion HTTPS Gemini:', err);
        resolve(null);
      });

      request.on('timeout', () => {
        request.destroy();
        resolve(null);
      });

      request.write(postData);
      request.end();
    });
  }

  try {
    const preguntasGemini = await pedirAGemini();
    if (preguntasGemini) {
      return res.status(200).json(preguntasGemini);
    }
  } catch (err) {
    console.error('Error en ejecucion:', err);
  }

  // Si Gemini falla o excede tiempo limite, responde con preguntas locales seguro
  const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
  return res.status(200).json(respaldo);
};