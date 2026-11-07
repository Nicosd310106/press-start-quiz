import mysql from 'mysql2/promise';

// Acepta tanto prefijos MYSQL_ (configurados en Vercel) como DB_
const DB_HOST = process.env.MYSQL_HOST || process.env.DB_HOST;
const DB_USER = process.env.MYSQL_USER || process.env.DB_USER;
const DB_PASSWORD = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
const DB_NAME = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'press_start_quiz';
const DB_PORT = process.env.MYSQL_PORT || process.env.DB_PORT || 17384;

export const dbPool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: parseInt(DB_PORT, 10),
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Exportación por defecto para evitar errores de importación
export default dbPool;