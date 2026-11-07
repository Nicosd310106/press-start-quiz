import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const [rows] = await dbPool.query(
            'SELECT id, nickname, puntos_totales FROM usuarios ORDER BY puntos_totales DESC LIMIT 10'
        );

        return res.status(200).json({ 
            exito: true,
            ranking: rows || [] 
        });
    } catch (error) {
        console.error("Error al obtener el ranking:", error);
        return res.status(500).json({
            error: 'Error al consultar la tabla de posiciones',
            detalle: error.message
        });
    }
}