import { dbPool } from '../db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { nickname, password } = req.body;

    try {
        const [rows] = await dbPool.execute(
            'SELECT id, nickname, password_hash, puntos_totales FROM usuarios WHERE nickname = ?',
            [nickname]
        );

        if (rows.length === 0 || rows[0].password_hash !== password) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const usuario = rows[0];

        // Obtener el inventario del usuario
        const [inventario] = await dbPool.execute(
            'SELECT cant_mitad, cant_escudo, cant_saltar, cant_doble FROM inventarios WHERE usuario_id = ?',
            [usuario.id]
        );

        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                id: usuario.id,
                nickname: usuario.nickname,
                puntos: usuario.puntos_totales,
                inventario: inventario[0] || { cant_mitad: 0, cant_escudo: 0, cant_saltar: 0, cant_doble: 0 }
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor al iniciar sesión', detalle: error.message });
    }
}