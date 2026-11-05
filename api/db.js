import mysql from 'mysql2/promise';

export const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-press-start-press-start-quiz.k.aivencloud.com',
    port: parseInt(process.env.DB_PORT || '27504', 10),
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});