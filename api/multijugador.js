import mysql from 'mysql2/promise';

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'defaultdb',
            ssl: { rejectUnauthorized: false },
            waitForConnections: true,
            connectionLimit: 5
        });
    }
    return pool;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const db = getPool();

        // Crea la tabla automáticamente si aún no existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS salas_multijugador (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo_sala VARCHAR(10) NOT NULL UNIQUE,
                categoria VARCHAR(100) NOT NULL,
                preguntas_json LONGTEXT NOT NULL,
                jugador1_nick VARCHAR(50) NOT NULL,
                jugador1_puntos INT DEFAULT 0,
                jugador1_termino TINYINT(1) DEFAULT 0,
                jugador2_nick VARCHAR(50) DEFAULT NULL,
                jugador2_puntos INT DEFAULT 0,
                jugador2_termino TINYINT(1) DEFAULT 0,
                estado VARCHAR(20) DEFAULT 'esperando',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // GET: Consultar estado de la sala (polling cada 2s)
        if (req.method === 'GET') {
            const { codigo } = req.query;
            if (!codigo) return res.status(400).json({ error: 'Falta código de sala' });

            const [rows] = await db.query(
                'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                [codigo.toUpperCase()]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: 'Sala no encontrada' });
            }

            return res.status(200).json({ sala: rows[0] });
        }

        // POST: Crear sala, unirse o actualizar puntaje
        if (req.method === 'POST') {
            const { accion, codigo, nickname, categoria, preguntas, puntos, termino } = req.body;

            if (accion === 'crear') {
                const nuevoCodigo = Math.random().toString(36).substring(2, 6).toUpperCase();
                await db.query(
                    `INSERT INTO salas_multijugador 
                    (codigo_sala, categoria, preguntas_json, jugador1_nick, estado) 
                    VALUES (?, ?, ?, ?, 'esperando')`,
                    [nuevoCodigo, categoria || 'Acción y Aventura', JSON.stringify(preguntas || []), nickname || 'Jugador1']
                );
                return res.status(200).json({ exito: true, codigo: nuevoCodigo });
            }

            if (accion === 'unirse') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await db.query(
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

                await db.query(
                    `UPDATE salas_multijugador 
                    SET jugador2_nick = ?, estado = 'jugando' 
                    WHERE codigo_sala = ?`,
                    [nickname || 'Jugador2', cod]
                );

                const [updated] = await db.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );
                return res.status(200).json({ exito: true, sala: updated[0] });
            }

            if (accion === 'actualizar') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await db.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );
                if (!rows || rows.length === 0) return res.status(404).json({ error: 'Sala no existe' });

                const sala = rows[0];
                const esJugador1 = (sala.jugador1_nick === nickname);

                if (esJugador1) {
                    await db.query(
                        'UPDATE salas_multijugador SET jugador1_puntos = ?, jugador1_termino = ? WHERE codigo_sala = ?',
                        [puntos || 0, termino ? 1 : 0, cod]
                    );
                } else {
                    await db.query(
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
        return res.status(500).json({ error: `Fallo BD: ${error.message}` });
    }
}