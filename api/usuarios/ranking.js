import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        // Asegurarnos de obtener la instancia del pool de conexiones
        const connection = pool || (await import('./db.js')).dbPool;

        // Consulta especificando la base de datos para Aiven MySQL
        const [rows] = await connection.query(
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