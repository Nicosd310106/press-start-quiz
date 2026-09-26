import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Configurar cabeceras CORS para permitir peticiones desde GitHub Pages
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // O puedes poner tu enlace exacto de GitHub si prefieres
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder automáticamente a las peticiones de tipo OPTIONS (pre-flight de CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { genre, level } = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Genera un cuestionario de trivia de 5 preguntas sobre videojuegos del género "${genre}" con dificultad "${level}". 
    La respuesta debe ser estrictamente un JSON válido que sea un arreglo de objetos, sin texto adicional, sin bloques de código markdown (\`\`\`json), con esta estructura exacta:
    [
      {
        "q": "¿Pregunta aquí?",
        "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
        "correct": 0
      }
    ]
    Donde "correct" es el índice numérico de la opción correcta (de 0 a 3).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text.trim();
    
    // Limpieza por si la IA devuelve bloques de código
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const questions = JSON.parse(text);
    return res.status(200).json(questions);

  } catch (error) {
    console.error("Error en la API:", error);
    return res.status(500).json({ error: "Error al generar preguntas con la IA", detalle: error.message });
  }
}