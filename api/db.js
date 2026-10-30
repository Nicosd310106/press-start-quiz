import mysql from 'mysql2/promise';

// Configuración de la conexión mediante Variables de Entorno (Local y Cloud Aiven)
export const dbPool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.HOST || 'localhost',
    user: process.env.MYSQL_USER || process.env.USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DATABASE || 'press_start_quiz',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : (process.env.PORT ? parseInt(process.env.PORT) : 3306),
    ssl: (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com')) ? { rejectUnauthorized: false } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});