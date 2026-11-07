import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const genre = req.method === 'POST' ? req.body.genre : req.query.genre;
    const level = req.method === 'POST' ? req.body.level : req.query.level;
    const generoBuscado = genre || 'Acción y Aventura';

    try {
        // 1. Buscar preguntas guardadas asociadas al género solicitado
        const [preguntasBD] = await pool.execute(
            `SELECT p.id, p.enunciado AS q 
             FROM preguntas p 
             JOIN categorias c ON p.categoria_id = c.id 
             WHERE LOWER(c.nombre) LIKE LOWER(?) AND LOWER(p.dificultad) = LOWER(?) 
             ORDER BY RAND() LIMIT 10`,
            [`%${generoBuscado}%`, level || 'Fácil']
        );

        if (preguntasBD.length > 0) {
            const preguntasCompletas = await Promise.all(preguntasBD.map(async (p) => {
                const [opciones] = await pool.execute(
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

        // 2. Banco Fallback clasificado según la categoría elegida (Evita cruces)
        const bancosPorCategoria = {
            "Deportes": [
                { q: "¿En qué año se lanzó el primer FIFA de EA Sports?", options: ["1993", "1998", "2000", "1990"], correct: 0 },
                { q: "¿Qué saga de fútbol arcade perteneció a Konami?", options: ["PES / Winning Eleven", "FIFA", "Virtua Striker", "Red Card"], correct: 0 }
            ],
            "Survival Horror": [
                { q: "¿Qué estudio desarrolló originalmente la saga Silent Hill?", options: ["Capcom", "Team Silent (Konami)", "Shinra", "Square Enix"], correct: 1 },
                { q: "¿En qué año se lanzó el primer Resident Evil?", options: ["1996", "1998", "2000", "1994"], correct: 0 }
            ]
        };

        const preguntasFallback = bancosPorCategoria[generoBuscado] || [
            {
                q: `¿Pregunta referente al género de ${generoBuscado}?`,
                options: ["Respuesta Correcta", "Opción B", "Opción C", "Opción D"],
                correct: 0
            }
        ];

        return res.status(200).json(preguntasFallback);

    } catch (error) {
        console.error("Error en /api/generar:", error);
        return res.status(500).json({ error: "Error en el servidor de preguntas", detalle: error.message });
    }
}