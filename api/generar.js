import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

  const { genre, level } = req.body;

  if (!genre || !level) {
    return res.status(400).json({ error: "Faltan los parámetros 'genre' o 'level'" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const schema = {
      type: SchemaType.ARRAY,
      description: "Lista de 5 preguntas de trivia",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          q: {
            type: SchemaType.STRING,
            description: "Pregunta de trivia sobre videojuegos",
          },
          options: {
            type: SchemaType.ARRAY,
            description: "Arreglo de 4 opciones de respuesta",
            items: {
              type: SchemaType.STRING,
            },
          },
          correct: {
            type: SchemaType.INTEGER,
            description: "Índice de la opción correcta (entre 0 y 3)",
          },
        },
        required: ["q", "options", "correct"],
      },
    };

    // Inicialización explícita con apiVersion
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      },
      { apiVersion: "v1beta" }
    );

    const prompt = `Genera un cuestionario de trivia gamer de 5 preguntas sobre videojuegos del género "${genre}" con dificultad "${level}". Asegúrate de que 1 opción sea correcta y 3 incorrectas pero creíbles.`;

    const result = await model.generateContent(prompt);
    const questions = JSON.parse(result.response.text());

    return res.status(200).json(questions);

  } catch (error) {
    console.error("Error en la API:", error);
    return res.status(500).json({ 
      error: "Error al generar preguntas con la IA", 
      detalle: error.message 
    });
  }
}
