import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Configuración de Cabeceras CORS
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

  let { genre, level } = req.body || {};

  if (!genre || genre.trim() === "") genre = "General";
  if (!level || level.trim() === "") level = "Todas";

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Usamos gemini-1.5-flash con respuesta JSON forzada por la respuesta del modelo
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Genera un JSON estrictamente válido que contenga una lista de 5 preguntas de trivia gamer sobre el género "${genre}" y dificultad "${level}".
El formato DEBE ser un arreglo JSON con objetos que tengan exactamente esta estructura:
[
  {
    "q": "Texto de la pregunta",
    "options": ["Opción 0", "Opción 1", "Opción 2", "Opción 3"],
    "correct": 0
  }
]
Responde ÚNICAMENTE con el código JSON sin texto adicional ni bloques de formato markdown.`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    // Limpiamos por si la IA devuelve etiquetas tipo ```json ... ```
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
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
