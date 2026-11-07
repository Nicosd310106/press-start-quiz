import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, nickname, puntosObtenidos, categoriaId, dificultad } = req.body;

    if (!userId && !nickname) {
        return res.status(400).json({ error: 'Falta identificación de usuario' });
    }

    try {
        const puntosASumar = parseInt(puntosObtenidos, 10) || 0;
        const idCategoria = parseInt(categoriaId, 10) || 1;
        const difTexto = (dificultad || 'facil').toLowerCase();
        let idUsuario = userId ? parseInt(userId, 10) : null;

        if (!idUsuario && nickname) {
            const [users] = await pool.execute(
                'SELECT id FROM usuarios WHERE nickname = ? OR LOWER(nickname) = LOWER(?)',
                [nickname, nickname]
            );
            if (users.length > 0) {
                idUsuario = users[0].id;
            }
        }

        if (!idUsuario) {
            return res.status(404).json({ error: 'Usuario no encontrado en la BD' });
        }

        // 1. Sumar los puntos en el acumulado del usuario
        await pool.execute(
            'UPDATE usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntosASumar, idUsuario]
        );

        // 2. Registrar la partida efectuada
        await pool.execute(
            'INSERT INTO partidas (usuario_id, categoria_id, dificultad, puntaje_obtenido) VALUES (?, ?, ?, ?)',
            [idUsuario, idCategoria, difTexto, puntosASumar]
        );

        // 3. Traer los puntos acumulados totales
        const [rows] = await pool.execute(
            'SELECT puntos_totales FROM usuarios WHERE id = ?',
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