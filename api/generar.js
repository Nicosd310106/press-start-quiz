export default async function handler(req, res) {
  // 1. Cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Parsear el body si viene como string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  let genre = body?.genre || "General";
  let level = body?.level || "Todas";

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Falta la variable GEMINI_API_KEY en Vercel" });
  }

  try {
    const promptText = `Genera un cuestionario de trivia gamer de 5 preguntas sobre el género "${genre}" y dificultad "${level}".
Devuelve ÚNICAMENTE un arreglo JSON estrictamente válido sin formato markdown ni texto extra.
Estructura exacta esperada:
[
  {
    "q": "Pregunta aquí",
    "options": ["Opción 0", "Opción 1", "Opción 2", "Opción 3"],
    "correct": 0
  }
]`;

    // Modelo activo actual en la API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Error al conectar con la API de Google");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const questions = JSON.parse(cleanJson);

    return res.status(200).json(questions);

  } catch (error) {
    console.error("Error en la API:", error);
    return res.status(500).json({ 
      error: "Error al generar preguntas con la IA", 
      detalle: error.message 
    });
  }
}
