import { dbPool } from '../db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ error: 'Debes ingresar usuario y contraseña' });
    }

    try {
        // Buscar el usuario en la base de datos de Aiven (sin importar mayúsculas/minúsculas ni espacios)
        const [rows] = await dbPool.execute(
            'SELECT id, nickname, password_hash, puntos_totales FROM usuarios WHERE LOWER(TRIM(nickname)) = LOWER(TRIM(?))',
            [nickname]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const usuario = rows[0];

        // Verificar la contraseña
        if (usuario.password_hash !== password.trim()) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Devolver datos del usuario al frontend
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