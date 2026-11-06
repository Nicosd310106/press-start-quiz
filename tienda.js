import pool from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId, nickname, costo } = req.body;

  if (!costo || costo <= 0) {
    return res.status(400).json({ error: 'Costo inválido' });
  }

  try {
    // 1. Verificar puntos actuales en Aiven MySQL
    let selectQuery = 'SELECT puntos_totales FROM usuarios WHERE id = ?';
    let params = [userId];

    if (!userId && nickname) {
      selectQuery = 'SELECT puntos_totales FROM usuarios WHERE nickname = ?';
      params = [nickname];
    }

    const [rows] = await pool.query(selectQuery, params);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const puntosActuales = rows[0].puntos_totales || 0;

    if (puntosActuales < costo) {
      return res.status(400).json({ exito: false, error: 'Puntos insuficientes' });
    }

    // 2. Restar el costo del comodín
    const nuevosPuntos = puntosActuales - costo;
    let updateQuery = 'UPDATE usuarios SET puntos_totales = ? WHERE id = ?';
    if (!userId && nickname) {
      updateQuery = 'UPDATE usuarios SET puntos_totales = ? WHERE nickname = ?';
    }

    await pool.query(updateQuery, [nuevosPuntos, params[0]]);

    return res.status(200).json({
      exito: true,
      puntosTotales: nuevosPuntos
    });

  } catch (error) {
    console.error('Error en /api/tienda:', error);
    return res.status(500).json({ error: 'Error al procesar la compra en MySQL' });
  }
}