import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        // Consulta directa especificando el schema press_start_quiz para evitar fallas con defaultdb
        const [rows] = await dbPool.execute(
            'SELECT nickname, puntos_totales FROM press_start_quiz.usuarios ORDER BY puntos_totales DESC LIMIT 10'
        );

        return res.status(200).json({ ranking: rows });
    } catch (error) {
        console.error("Error al obtener el ranking:", error);
        return res.status(500).json({
            error: 'Error al consultar la tabla de posiciones',
            detalle: error.message
        });
    }
}