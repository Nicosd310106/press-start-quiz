import { dbPool } from '../db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, puntosObtenidos } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Falta el ID del usuario' });
    }

    try {
        // 1. Sumar los nuevos puntos/monedas al total del usuario en MySQL
        await dbPool.execute(
            'UPDATE usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntosObtenidos || 0, userId]
        );

        // 2. Registrar la partida en la tabla de historial
        await dbPool.execute(
            'INSERT INTO partidas (usuario_id, puntaje_obtenido) VALUES (?, ?)',
            [userId, puntosObtenidos || 0]
        );

        return res.status(200).json({ mensaje: '¡Puntos y monedas guardados en Aiven con éxito!' });
    } catch (error) {
        console.error("Error en /api/partida:", error);
        return res.status(500).json({ error: 'Error al actualizar puntos', detalle: error.message });
    }
}