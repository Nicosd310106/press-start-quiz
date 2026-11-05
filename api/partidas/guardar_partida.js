import { dbPool } from '../../db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, categoriaId, dificultad, puntajeObtenido, rachaMaxima } = req.body;

    if (!userId || puntajeObtenido === undefined) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (userId, puntajeObtenido)' });
    }

    try {
        // 1. Sumar los puntos obtenidos al total del usuario en Aiven
        await dbPool.execute(
            'UPDATE press_start_quiz.usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntajeObtenido, userId]
        );

        // 2. Registrar la partida en el historial
        if (categoriaId) {
            await dbPool.execute(
                'INSERT INTO press_start_quiz.partidas (usuario_id, categoria_id, dificultad, puntaje_obtenido, racha_maxima) VALUES (?, ?, ?, ?, ?)',
                [userId, categoriaId, dificultad || 'Estándar', puntajeObtenido, rachaMaxima || 0]
            );
        }

        // 3. Devolver los puntos actualizados
        const [rows] = await dbPool.execute(
            'SELECT puntos_totales FROM press_start_quiz.usuarios WHERE id = ?',
            [userId]
        );

        return res.status(200).json({
            exito: true,
            puntosTotales: rows[0]?.puntos_totales || 0
        });
    } catch (error) {
        console.error("Error al guardar partida/puntos:", error);
        return res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
    }
}