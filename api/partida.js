import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, nickname, puntosObtenidos } = req.body;

    if (!userId && !nickname) {
        return res.status(400).json({ error: 'Falta identificación de usuario' });
    }

    try {
        const puntosASumar = parseInt(puntosObtenidos, 10) || 0;
        let idUsuario = userId ? parseInt(userId, 10) : null;

        // Si no viene ID, buscar en MySQL por el nickname del usuario
        if (!idUsuario && nickname) {
            const [users] = await dbPool.execute(
                'SELECT id FROM press_start_quiz.usuarios WHERE nickname = ? OR LOWER(nickname) = LOWER(?)',
                [nickname, nickname]
            );
            if (users.length > 0) {
                idUsuario = users[0].id;
            }
        }

        if (!idUsuario) {
            return res.status(404).json({ error: 'Usuario no encontrado en la BD' });
        }

        // 1. Sumar los puntos en MySQL Aiven
        await dbPool.execute(
            'UPDATE press_start_quiz.usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntosASumar, idUsuario]
        );

        // 2. Insertar historial de la partida
        await dbPool.execute(
            'INSERT INTO press_start_quiz.partidas (usuario_id, puntaje_obtenido) VALUES (?, ?)',
            [idUsuario, puntosASumar]
        );

        // 3. Traer el total real de puntos actualizado desde la BD
        const [rows] = await dbPool.execute(
            'SELECT puntos_totales FROM press_start_quiz.usuarios WHERE id = ?',
            [idUsuario]
        );

        const totalActual = rows[0] ? rows[0].puntos_totales : 0;

        return res.status(200).json({
            exito: true,
            mensaje: 'Puntos guardados correctamente',
            puntosTotales: totalActual
        });
    } catch (error) {
        console.error("Error en /api/partida:", error);
        return res.status(500).json({ error: 'Error interno en la BD', detalle: error.message });
    }
}