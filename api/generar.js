import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const genre = req.method === 'POST' ? req.body.genre : req.query.genre;
    const level = req.method === 'POST' ? req.body.level : req.query.level;
    const generoBuscado = genre || 'Survival Horror';
    const dificultadBuscada = level || 'Fácil';

    try {
        // Intentar consultar en la BD de Aiven MySQL
        const [preguntasBD] = await dbPool.execute(
            `SELECT p.id, p.enunciado AS q 
             FROM preguntas p 
             JOIN categorias c ON p.categoria_id = c.id 
             WHERE LOWER(c.nombre) LIKE LOWER(?) AND LOWER(p.dificultad) = LOWER(?) 
             ORDER BY RAND() LIMIT 10`,
            [`%${generoBuscado}%`, dificultadBuscada]
        );

        if (preguntasBD && preguntasBD.length > 0) {
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
    } catch (error) {
        console.error("Error al consultar MySQL en /api/generar:", error);
    }

    // BANCO DE RESPALDO GARANTIZADO POR CATEGORÍA
    const bancosPorCategoria = {
        "Survival Horror": [
            { q: "¿Qué estudio desarrolló originalmente la saga Silent Hill?", options: ["Capcom", "Team Silent (Konami)", "Shinra", "Square Enix"], correct: 1 },
            { q: "¿En qué año se lanzó el primer Resident Evil?", options: ["1996", "1998", "2000", "1994"], correct: 0 },
            { q: "¿Cómo se llama la protagonista de Silent Hill 3?", options: ["Heather Mason", "Jill Valentine", "Claire Redfield", "Ada Wong"], correct: 0 }
        ],
        "Deportes": [
            { q: "¿En qué año se lanzó el primer FIFA de EA Sports?", options: ["1993", "1998", "2000", "1990"], correct: 0 },
            { q: "¿Qué saga de fútbol arcade perteneció a Konami?", options: ["PES / Winning Eleven", "FIFA", "Virtua Striker", "Red Card"], correct: 0 }
        ]
    };

    const preguntasFallback = bancosPorCategoria[generoBuscado] || [
        {
            q: `¿Pregunta clásica de ${generoBuscado}?`,
            options: ["Respuesta Correcta", "Opción Incorrecta 1", "Opción Incorrecta 2", "Opción Incorrecta 3"],
            correct: 0
        }
    ];

    return res.status(200).json(preguntasFallback);
}