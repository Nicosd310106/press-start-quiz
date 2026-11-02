import { dbPool } from '../db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { nickname, password } = req.body;

    if (!nickname || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Sanitización estricta de entrada (quita espacios accidentales)
    const nickClean = String(nickname).trim();
    const passClean = String(password).trim();

    if (nickClean.length < 3) {
        return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' });
    }

    try {
        // 1. Insertar el nuevo usuario en la base de datos de Aiven
        const [result] = await dbPool.execute(
            'INSERT INTO usuarios (nickname, password_hash, puntos_totales) VALUES (?, ?, 0)',
            [nickClean, passClean]
        );

        const newUserId = result.insertId;

        // 2. Crear su registro de inventario inicial en la base de datos
        await dbPool.execute(
            'INSERT INTO inventarios (usuario_id, cant_mitad, cant_escudo, cant_saltar, cant_doble) VALUES (?, 0, 0, 0, 0)',
            [newUserId]
        );

        return res.status(201).json({
            mensaje: '¡Usuario registrado exitosamente!',
            userId: newUserId,
            nickname: nickClean
        });
    } catch (error) {
        console.error("Error en /api/registro:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        return res.status(500).json({
            error: 'Error en el servidor al registrar usuario',
            detalle: error.message
        });
    }
}