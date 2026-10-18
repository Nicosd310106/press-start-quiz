import https from 'https';

export default async function handler(req, res) {
  // Manejo de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Banco local de respaldo 100% seguro
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
      if (Buffer.isBuffer(body)) {
        body = body.toString('utf-8');
      }
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {}
      }
      if (body && typeof body === 'object' && body.genre) {
        genre = body.genre;
      }
    }
  } catch (e) {
    console.error('Error procesando request body:', e);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    console.warn('GEMINI_API_KEY no encontrada. Devolviendo preguntas de respaldo.');
    const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
    return res.status(200).json(respaldo);
  }

  function pedirAGemini() {
    return new Promise((resolve) => {
      try {
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
          timeout: 6000
        };

        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              if (response.statusCode === 200) {
                const json = JSON.parse(data);
                const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanText);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return resolve(parsed);
                }
              } else {
                console.error(`Gemini API devolvió status code: ${response.statusCode}`, data);
              }
            } catch (err) {
              console.error('Error parseando JSON de Gemini:', err);
            }
            resolve(null);
          });
        });

        request.on('error', (err) => {
          console.error('Error en petición HTTPS a Gemini:', err);
          resolve(null);
        });

        request.on('timeout', () => {
          request.destroy();
          resolve(null);
        });

        request.write(postData);
        request.end();
      } catch (err) {
        console.error('Excepción lanzada en pedirAGemini:', err);
        resolve(null);
      }
    });
  }

  try {
    const preguntasGemini = await pedirAGemini();
    if (preguntasGemini) {
      return res.status(200).json(preguntasGemini);
    }
  } catch (err) {
    console.error('Error durante la ejecución serverless:', err);
  }

  const respaldo = PREGUNTAS_RESPALDO[genre] || PREGUNTAS_RESPALDO["RPG"];
  return res.status(200).json(respaldo);
}