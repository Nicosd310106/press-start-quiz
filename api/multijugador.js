import { dbPool } from './db.js';

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { codigo } = req.query;
            if (!codigo) return res.status(400).json({ error: 'Falta código de sala' });

            const [rows] = await dbPool.query(
                'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                [codigo.toUpperCase()]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Sala no encontrada' });
            }

            return res.status(200).json({ sala: rows[0] });
        }

        if (req.method === 'POST') {
            const { accion, codigo, nickname, categoria, preguntas, puntos, termino } = req.body;

            if (accion === 'crear') {
                const nuevoCodigo = Math.random().toString(36).substring(2, 6).toUpperCase();
                await dbPool.query(
                    `INSERT INTO salas_multijugador 
                    (codigo_sala, categoria, preguntas_json, jugador1_nick, estado) 
                    VALUES (?, ?, ?, ?, 'esperando')`,
                    [nuevoCodigo, categoria, JSON.stringify(preguntas), nickname]
                );
                return res.status(200).json({ exito: true, codigo: nuevoCodigo });
            }

            if (accion === 'unirse') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await dbPool.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Código de sala inválido' });
                }

                const sala = rows[0];
                if (sala.jugador2_nick && sala.jugador2_nick !== nickname) {
                    return res.status(400).json({ error: 'La sala ya está llena' });
                }

                await dbPool.query(
                    `UPDATE salas_multijugador 
                    SET jugador2_nick = ?, estado = 'jugando' 
                    WHERE codigo_sala = ?`,
                    [nickname, cod]
                );

                const [updated] = await dbPool.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );
                return res.status(200).json({ exito: true, sala: updated[0] });
            }

            if (accion === 'actualizar') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await dbPool.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );
                if (!rows || rows.length === 0) return res.status(404).json({ error: 'Sala no existe' });

                const sala = rows[0];
                const esJugador1 = (sala.jugador1_nick === nickname);

                if (esJugador1) {
                    await dbPool.query(
                        'UPDATE salas_multijugador SET jugador1_puntos = ?, jugador1_termino = ? WHERE codigo_sala = ?',
                        [puntos || 0, termino ? 1 : 0, cod]
                    );
                } else {
                    await dbPool.query(
                        'UPDATE salas_multijugador SET jugador2_puntos = ?, jugador2_termino = ? WHERE codigo_sala = ?',
                        [puntos || 0, termino ? 1 : 0, cod]
                    );
                }

                return res.status(200).json({ exito: true });
            }
        }

        return res.status(405).json({ error: 'Método no permitido' });
    } catch (error) {
        console.error('Error en multijugador:', error);
        return res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
    }
}