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

        await db.query(`
            CREATE TABLE IF NOT EXISTS salas_multijugador (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo_sala VARCHAR(10) NOT NULL UNIQUE,
                categoria VARCHAR(100) NOT NULL,
                modo VARCHAR(10) DEFAULT '1v1',
                preguntas_json LONGTEXT NOT NULL,
                jugadores_json LONGTEXT,
                chat_json LONGTEXT,
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

        // Migración segura por si la tabla ya existía sin las nuevas columnas
        const columnasNuevas = [
            "ALTER TABLE salas_multijugador ADD COLUMN modo VARCHAR(10) DEFAULT '1v1'",
            "ALTER TABLE salas_multijugador ADD COLUMN jugadores_json LONGTEXT",
            "ALTER TABLE salas_multijugador ADD COLUMN chat_json LONGTEXT"
        ];
        for (const sql of columnasNuevas) {
            try { await db.query(sql); } catch (_) { /* Ya existe */ }
        }

        // GET: Consultar estado de la sala
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

        // POST: Acciones de sala
        if (req.method === 'POST') {
            const { accion, codigo, nickname, categoria, modo, preguntas, puntos, termino, mensaje, canal, equipo } = req.body;

            if (accion === 'crear') {
                const nuevoCodigo = Math.random().toString(36).substring(2, 6).toUpperCase();
                const modoSeleccionado = ['1v1', '2v2', '3v3', '4v4'].includes(modo) ? modo : '1v1';
                const jugadoresIniciales = [{
                    nick: nickname || 'Anfitrión',
                    equipo: 'A',
                    puntos: 0,
                    termino: false,
                    esAnfitrion: true
                }];
                const chatInicial = [{
                    autor: 'SISTEMA',
                    equipo: 'ALL',
                    canal: 'todos',
                    texto: `Sala ${modoSeleccionado} creada por ${nickname}. ¡Bienvenidos!`
                }];

                await db.query(
                    `INSERT INTO salas_multijugador 
                    (codigo_sala, categoria, modo, preguntas_json, jugadores_json, chat_json, jugador1_nick, estado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'esperando')`,
                    [
                        nuevoCodigo,
                        categoria || 'Acción y Aventura',
                        modoSeleccionado,
                        JSON.stringify(preguntas || []),
                        JSON.stringify(jugadoresIniciales),
                        JSON.stringify(chatInicial),
                        nickname || 'Jugador1'
                    ]
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
                if (sala.estado !== 'esperando') {
                    return res.status(400).json({ error: 'La partida ya comenzó o finalizó' });
                }

                const modoSala = sala.modo || '1v1';
                const porEquipo = parseInt(modoSala.split('v')[0], 10) || 1;
                const maxJugadores = porEquipo * 2;

                let jugadores = [];
                try {
                    jugadores = sala.jugadores_json ? JSON.parse(sala.jugadores_json) : [];
                } catch (_) { jugadores = []; }

                let chat = [];
                try {
                    chat = sala.chat_json ? JSON.parse(sala.chat_json) : [];
                } catch (_) { chat = []; }

                const yaEsta = jugadores.find(j => j.nick === nickname);
                if (!yaEsta) {
                    if (jugadores.length >= maxJugadores) {
                        return res.status(400).json({ error: `La sala ${modoSala} ya está llena (${maxJugadores}/${maxJugadores})` });
                    }
                    const countA = jugadores.filter(j => j.equipo === 'A').length;
                    const countB = jugadores.filter(j => j.equipo === 'B').length;
                    const equipoAsignado = countB < countA ? 'B' : (countA < porEquipo ? 'A' : 'B');

                    jugadores.push({
                        nick: nickname || 'Jugador',
                        equipo: equipoAsignado,
                        puntos: 0,
                        termino: false,
                        esAnfitrion: false
                    });

                    chat.push({
                        autor: 'SISTEMA',
                        equipo: 'ALL',
                        canal: 'todos',
                        texto: `${nickname} se unió al Equipo ${equipoAsignado}.`
                    });

                    await db.query(
                        `UPDATE salas_multijugador 
                        SET jugadores_json = ?, chat_json = ?, jugador2_nick = ?
                        WHERE codigo_sala = ?`,
                        [JSON.stringify(jugadores), JSON.stringify(chat), nickname, cod]
                    );
                }

                const [updated] = await db.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );
                return res.status(200).json({ exito: true, sala: updated[0] });
            }

            if (accion === 'cambiar_equipo') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await db.query('SELECT * FROM salas_multijugador WHERE codigo_sala = ?', [cod]);
                if (!rows || rows.length === 0) return res.status(404).json({ error: 'Sala no existe' });

                const sala = rows[0];
                const porEquipo = parseInt((sala.modo || '1v1').split('v')[0], 10) || 1;
                let jugadores = JSON.parse(sala.jugadores_json || '[]');
                const jug = jugadores.find(j => j.nick === nickname);

                if (jug) {
                    const destino = jug.equipo === 'A' ? 'B' : 'A';
                    const countDestino = jugadores.filter(j => j.equipo === destino).length;
                    if (countDestino >= porEquipo) {
                        return res.status(400).json({ error: `El Equipo ${destino} ya está completo (${porEquipo}/${porEquipo})` });
                    }
                    jug.equipo = destino;
                    await db.query(
                        'UPDATE salas_multijugador SET jugadores_json = ? WHERE codigo_sala = ?',
                        [JSON.stringify(jugadores), cod]
                    );
                }
                return res.status(200).json({ exito: true });
            }

            if (accion === 'chat') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await db.query('SELECT chat_json FROM salas_multijugador WHERE codigo_sala = ?', [cod]);
                if (!rows || rows.length === 0) return res.status(404).json({ error: 'Sala no existe' });

                let chat = [];
                try { chat = JSON.parse(rows[0].chat_json || '[]'); } catch (_) { chat = []; }

                chat.push({
                    autor: nickname || 'Jugador',
                    equipo: equipo || 'A',
                    canal: canal === 'equipo' ? 'equipo' : 'todos',
                    texto: String(mensaje || '').slice(0, 140)
                });
                if (chat.length > 40) chat = chat.slice(-40);

                await db.query(
                    'UPDATE salas_multijugador SET chat_json = ? WHERE codigo_sala = ?',
                    [JSON.stringify(chat), cod]
                );
                return res.status(200).json({ exito: true });
            }

            if (accion === 'iniciar_partida') {
                const cod = (codigo || '').toUpperCase();
                await db.query(
                    "UPDATE salas_multijugador SET estado = 'jugando' WHERE codigo_sala = ?",
                    [cod]
                );
                return res.status(200).json({ exito: true });
            }

            if (accion === 'actualizar') {
                const cod = (codigo || '').toUpperCase();
                const [rows] = await db.query(
                    'SELECT * FROM salas_multijugador WHERE codigo_sala = ?',
                    [cod]
                );
                if (!rows || rows.length === 0) return res.status(404).json({ error: 'Sala no existe' });

                const sala = rows[0];
                let jugadores = [];
                try { jugadores = JSON.parse(sala.jugadores_json || '[]'); } catch (_) { jugadores = []; }

                const jug = jugadores.find(j => j.nick === nickname);
                if (jug) {
                    jug.puntos = puntos || 0;
                    if (termino) jug.termino = true;
                }

                await db.query(
                    'UPDATE salas_multijugador SET jugadores_json = ? WHERE codigo_sala = ?',
                    [JSON.stringify(jugadores), cod]
                );

                return res.status(200).json({ exito: true });
            }
        }

        return res.status(405).json({ error: 'Método no permitido' });
    } catch (error) {
        console.error('Error en multijugador:', error);
        return res.status(500).json({ error: `Fallo BD: ${error.message}` });
    }
}