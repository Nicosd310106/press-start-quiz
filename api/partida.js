import { dbPool } from './db.js';

const MAX_PUNTOS_TIENDA = 200;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { userId, nickname, puntosObtenidos, puntosTotalesDirectos } = req.body;
        const nombreUsuario = nickname || 'invitado';

        if (puntosTotalesDirectos !== undefined && puntosTotalesDirectos !== null) {
            const nuevoTotal = Math.min(MAX_PUNTOS_TIENDA, Math.max(0, parseInt(puntosTotalesDirectos, 10) || 0));
            await dbPool.query(
                'UPDATE usuarios SET puntos_totales = ? WHERE id = ? OR nickname = ?',
                [nuevoTotal, userId || 0, nombreUsuario]
            );
            return res.status(200).json({ exito: true, puntosTotales: nuevoTotal });
        }

        const puntosASumar = parseInt(puntosObtenidos, 10) || 0;

        const [rows] = await dbPool.query(
            'SELECT puntos_totales FROM usuarios WHERE id = ? OR nickname = ?',
            [userId || 0, nombreUsuario]
        );

        let puntosPrevios = 0;
        if (rows && rows.length > 0) {
            puntosPrevios = Math.max(0, parseInt(rows[0].puntos_totales, 10) || 0);
        }

        const puntajeFinal = Math.min(MAX_PUNTOS_TIENDA, Math.max(0, puntosPrevios + puntosASumar));

        await dbPool.query(
            'UPDATE usuarios SET puntos_totales = ? WHERE id = ? OR nickname = ?',
            [puntajeFinal, userId || 0, nombreUsuario]
        );

        return res.status(200).json({ 
            exito: true, 
            puntosTotales: puntajeFinal 
        });
    } catch (error) {
        console.error("Error al registrar la partida:", error);
        return res.status(500).json({ error: 'Error al actualizar puntos en la base de datos', detalle: error.message });
    }
}