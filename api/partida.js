import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { userId, nickname, puntosObtenidos, categoriaId } = req.body;

    if (!userId && !nickname) {
        return res.status(400).json({ error: 'Falta identificación de usuario' });
    }

    try {
        const puntosASumar = parseInt(puntosObtenidos, 10) || 0;
        const idCategoria = parseInt(categoriaId, 10) || 1; // Si no viene categoría, usa 1 por defecto
        let idUsuario = userId ? parseInt(userId, 10) : null;

        // Si no se envió ID, buscar por nickname en la base de datos de Aiven
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

        // 1. Sumar los puntos en el total del usuario en MySQL Aiven
        await dbPool.execute(
            'UPDATE press_start_quiz.usuarios SET puntos_totales = puntos_totales + ? WHERE id = ?',
            [puntosASumar, idUsuario]
        );

        // 2. Insertar en la tabla partidas incluyendo categoria_id para cumplir con el esquema de la BD
        await dbPool.execute(
            'INSERT INTO press_start_quiz.partidas (usuario_id, categoria_id, puntaje_obtenido) VALUES (?, ?, ?)',
            [idUsuario, idCategoria, puntosASumar]
        );

        // 3. Traer los puntos acumulados totales
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