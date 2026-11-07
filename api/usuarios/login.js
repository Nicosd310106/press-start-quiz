import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ error: 'Debes ingresar usuario y contraseña' });
    }

    // Limpieza defensiva de espacios del teclado
    const nickClean = String(nickname).trim();
    const passClean = String(password).trim();

    try {
        // Consulta en Aiven MySQL ignorando mayúsculas y espacios
        const [rows] = await pool.execute(
            'SELECT id, nickname, password_hash, puntos_totales FROM usuarios WHERE LOWER(TRIM(nickname)) = LOWER(?)',
            [nickClean.toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const usuario = rows[0];
        const passBD = String(usuario.password_hash).trim();

        if (passBD !== passClean) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Respuesta exitosa formateada en JSON
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            userId: usuario.id,
            nickname: usuario.nickname,
            puntosTotales: usuario.puntos_totales
        });

    } catch (error) {
        console.error("Error en /api/login:", error);
        return res.status(500).json({
            error: 'Error al conectar con la base de datos',
            detalle: error.message
        });
    }
}