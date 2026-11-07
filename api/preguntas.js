import { dbPool } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { categoria_id, dificultad } = req.query;

    let query = `
      SELECT 
        p.id AS pregunta_id,
        p.enunciado,
        p.dificultad,
        p.categoria_id,
        o.id AS opcion_id,
        o.texto_opcion,
        o.es_correcta
      FROM preguntas p
      INNER JOIN opciones o ON p.id = o.pregunta_id
    `;

    const conditions = [];
    const params = [];

    if (categoria_id) {
      conditions.push('p.categoria_id = ?');
      params.push(parseInt(categoria_id, 10));
    }

    if (dificultad) {
      conditions.push('LOWER(p.dificultad) = ?');
      params.push(dificultad.toString().toLowerCase());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY RAND()';

    const [rows] = await dbPool.query(query, params);

    if (!rows || rows.length === 0) {
      return res.status(200).json({ 
        exito: true, 
        total: 0, 
        preguntas: [] 
      });
    }

    const preguntasMap = new Map();

    rows.forEach(row => {
      if (!preguntasMap.has(row.pregunta_id)) {
        preguntasMap.set(row.pregunta_id, {
          id: row.pregunta_id,
          enunciado: row.enunciado,
          dificultad: row.dificultad,
          categoria_id: row.categoria_id,
          opciones: []
        });
      }

      preguntasMap.get(row.pregunta_id).opciones.push({
        id: row.opcion_id,
        texto_opcion: row.texto_opcion,
        es_correcta: row.es_correcta
      });
    });

    const preguntasFormateadas = Array.from(preguntasMap.values());

    return res.status(200).json({
      exito: true,
      total: preguntasFormateadas.length,
      preguntas: preguntasFormateadas
    });

  } catch (error) {
    console.error('Error en /api/preguntas:', error);
    return res.status(500).json({ 
      error: 'Error al consultar las preguntas en la base de datos MySQL',
      detalle: error.message 
    });
  }
}