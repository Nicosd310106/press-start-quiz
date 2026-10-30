import { dbPool } from './db.js';

export default async function handler(req, res) {
    // Permitir solicitudes GET y POST (soluciona error 405 en GitHub Pages)
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const genre = req.method === 'POST' ? req.body.genre : req.query.genre;
    const level = req.method === 'POST' ? req.body.level : req.query.level;

    try {
        // 1. Intentar buscar preguntas guardadas en la base de datos MySQL (reutilización)
        const [preguntasBD] = await dbPool.execute(
            `SELECT p.id, p.enunciado AS q 
             FROM preguntas p 
             JOIN categorias c ON p.categoria_id = c.id 
             WHERE c.nombre = ? AND p.dificultad = ? 
             ORDER BY RAND() LIMIT 10`,
            [genre || 'Acción y Aventura', level || 'Fácil']
        );

        if (preguntasBD.length > 0) {
            // Traer las opciones de las preguntas encontradas
            const preguntasCompletas = await Promise.all(preguntasBD.map(async (p) => {
                const [opciones] = await dbPool.execute(
                    'SELECT texto_opcion, es_correcta FROM opciones WHERE pregunta_id = ?',
                    [p.id]
                );
                
                const optionsTexts = opciones.map(o => o.texto_opcion);
                const correctIndex = opciones.findIndex(o => o.es_correcta === 1 || o.es_correcta === true);

                return {
                    q: p.q,
                    options: optionsTexts,
                    correct: correctIndex >= 0 ? correctIndex : 0
                };
            }));

            return res.status(200).json(preguntasCompletas);
        }

        // 2. Si no hay preguntas guardadas en MySQL, devolver un banco base estándar
        const preguntasFallback = [
            {
                q: "¿Qué estudio desarrolló originalmente la saga Silent Hill?",
                options: ["Capcom", "Team Silent (Konami)", "Shinra", "Square Enix"],
                correct: 1
            },
            {
                q: "¿En qué año se lanzó el primer Resident Evil?",
                options: ["1996", "1998", "2000", "1994"],
                correct: 0
            }
        ];

        return res.status(200).json(preguntasFallback);

    } catch (error) {
        console.error("Error al obtener o guardar preguntas:", error);
        return res.status(500).json({ error: "Error en el servidor de preguntas", detalle: error.message });
    }
}
