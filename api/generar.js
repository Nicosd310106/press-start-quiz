export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { genre, level } = req.body;

    const promptText = `Genera 5 preguntas de trivia sobre videojuegos de la categoría "${genre}" con un nivel de dificultad "${level}". 
Devuélveme estrictamente un JSON válido (un array de objetos), sin texto adicional, explicaciones ni bloques de markdown fuera del json. 
Cada objeto debe tener exactamente estas propiedades:
- "q": El texto de la pregunta.
- "options": Un array con exactamente 4 opciones de respuesta en texto.
- "correct": Un número entero del 0 al 3 que indique la posición de la opción correcta dentro del array "options".`;

    try {
        const parte1 = "AQ.Ab8RN6K2XShdbXmMnIYuS8aXoapXV4";
        const parte2 = "Cab0f5Vvf4pD8a_DgALA";
        const tokenAQ = parte1 + parte2;

        const urlAPI = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

        const respuestaGoogle = await fetch(urlAPI, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenAQ}`
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await respuestaGoogle.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No se recibieron datos de la IA");
        }

        const textoGenerado = data.candidates[0].content.parts[0].text;
        const jsonLimpio = textoGenerado.replace(/```json/g, "").replace(/```/g, "").trim();
        const preguntasJSON = JSON.parse(jsonLimpio);

        return res.status(200).json(preguntasJSON);

    } catch (error) {
        console.error("Error en el servidor:", error);
        return res.status(500).json({ error: "Fallo al generar preguntas con la IA" });
    }
}
