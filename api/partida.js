import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, puntosObtenidos } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Falta el ID del usuario' });
    }

    try {
        const puntosASumar = puntosObtenidos || 0;

        // 1. Sumar puntos al total del usuario en MySQL Aiven
        await dbPool.execute(
            'UPDATE press_start_quiz.usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntosASumar, userId]
        );

        // 2. Registrar la partida en el historial
        await dbPool.execute(
            'INSERT INTO press_start_quiz.partidas (usuario_id, puntaje_obtenido) VALUES (?, ?)',
            [userId, puntosASumar]
        );

        // 3. Obtener los puntos totales actualizados desde MySQL
        const [rows] = await dbPool.execute(
            'SELECT puntos_totales FROM press_start_quiz.usuarios WHERE id = ?',
            [userId]
        );

        const puntosTotales = rows[0] ? rows[0].puntos_totales : 0;

        return res.status(200).json({
            exito: true,
            mensaje: 'Puntos guardados en Aiven con éxito',
            puntosTotales: puntosTotales
        });
    } catch (error) {
        console.error("Error en /api/partida:", error);
        return res.status(500).json({ error: 'Error al actualizar puntos', detalle: error.message });
    }
}