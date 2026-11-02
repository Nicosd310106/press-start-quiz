INSERT INTO press_start_quiz.usuarios (nickname, password_hash, puntos_totales) 
VALUES ('Martin333', '1234', 0)
ON DUPLICATE KEY UPDATE password_hash = '1234';