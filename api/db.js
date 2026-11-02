import mysql from 'mysql2/promise';

// Configuración de la conexión mediante Variables de Entorno de Vercel / Aiven
export const dbPool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'press_start_quiz',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306),
    ssl: { rejectUnauthorized: false }, // Requerido para Aiven en la nube
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});