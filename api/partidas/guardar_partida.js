import { dbPool } from '../db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, categoriaId, dificultad, puntajeObtenido, rachaMaxima } = req.body;

    if (!userId || !puntajeObtenido) {
        return res.status(400).json({ error: 'Faltan datos obligatorios (userId, puntajeObtenido)' });
    }

    try {
        // 1. Sumar los puntos obtenidos al total acumulado del usuario
        await dbPool.execute(
            'UPDATE usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntajeObtenido, userId]
        );

        // 2. Registrar el historial de la partida
        if (categoriaId) {
            await dbPool.execute(
                'INSERT INTO partidas (usuario_id, categoria_id, dificultad, puntaje_obtenido, racha_maxima) VALUES (?, ?, ?, ?, ?)',
                [userId, categoriaId, dificultad || 'Estándar', puntajeObtenido, rachaMaxima || 0]
            );
        }

        // 3. Obtener los puntos actualizados del usuario
        const [rows] = await dbPool.execute('SELECT puntos_totales FROM usuarios WHERE id = ?', [userId]);

        return res.status(200).json({
            exito: true,
            puntosTotales: rows[0]?.puntos_totales || 0
        });
    } catch (error) {
        console.error("Error al guardar partida/puntos:", error);
        return res.status(500).json({ error: 'Error interno en el servidor', detalle: error.message });
    }
}
