-- ==========================================================
-- BASE DE DATOS COMPLETA - PRESS START QUIZ (Aiven MySQL)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS press_start_quiz;
USE press_start_quiz;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    puntos_totales INT DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías (10 Géneros)
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 3. Tabla de Preguntas
CREATE TABLE IF NOT EXISTS preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    enunciado TEXT NOT NULL,
    dificultad VARCHAR(20) DEFAULT 'Fácil',
    explicacion TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

-- 4. Tabla de Opciones
CREATE TABLE IF NOT EXISTS opciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pregunta_id INT NOT NULL,
    texto_opcion VARCHAR(255) NOT NULL,
    es_correcta BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE CASCADE
);

-- 5. Tabla de Partidas (Historial)
CREATE TABLE IF NOT EXISTS partidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    dificultad VARCHAR(20),
    puntos_obtenidos INT DEFAULT 0,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

-- ==========================================================
-- CARGA DE DATOS INICIALES
-- ==========================================================

-- Insertar las 10 categorías
INSERT IGNORE INTO categorias (id, nombre) VALUES
(1, 'Survival Horror'),
(2, 'RPG'),
(3, 'Acción y Aventura'),
(4, 'Shooter / Disparos'),
(5, 'Lucha / Peleas'),
(6, 'Plataformas'),
(7, 'Estrategia'),
(8, 'Simulación'),
(9, 'Carreras'),
(10, 'Deportes');

-- Insertar usuario de prueba (sin contraseña real por seguridad en GitHub)
INSERT INTO usuarios (nickname, password_hash, puntos_totales) 
VALUES ('Martin333', 'demo1234', 0)
ON DUPLICATE KEY UPDATE puntos_totales = 0;

-- Insertar preguntas de muestra por categoría
INSERT INTO preguntas (id, categoria_id, enunciado, dificultad, explicacion) VALUES
(1, 1, '¿Qué estudio desarrolló originalmente la saga Silent Hill?', 'Fácil', 'Team Silent, un grupo interno de Konami, creó el primer Silent Hill en 1999 para PlayStation.'),
(2, 1, '¿En qué año se lanzó el primer Resident Evil?', 'Fácil', 'Capcom lanzó el primer Resident Evil en 1996, popularizando el género Survival Horror.'),
(3, 2, '¿Cómo se llama el mundo fantástico donde transcurre The Witcher?', 'Fácil', 'Geralt de Rivia recorre El Continente, un mundo inspirado en la mitología eslava.'),
(4, 3, '¿Cómo se llama el explorador cazatesoros de la saga Uncharted?', 'Fácil', 'Nathan Drake busca tesoros históricos perdidos alrededor del mundo junto a su mentor Sully.'),
(5, 4, '¿Qué mapa es el más icónico de la saga Counter-Strike?', 'Fácil', 'Dust II es el mapa competitivo más jugado en la historia de Counter-Strike desde 2001.'),
(6, 5, '¿Qué franquicia creó el famoso ataque de energía Hadoken?', 'Fácil', 'Ryu y Ken ejecutan el Hadoken en Street Fighter haciendo un cuarto de círculo adelante más golpe.'),
(7, 6, '¿En qué año se lanzó Super Mario Bros. para la consola NES?', 'Fácil', 'Lanzado en 1985, definió las reglas del diseño de niveles en los juegos de plataformas 2D.'),
(8, 7, '¿Qué juego de estrategia popularizó el sonido Wololo de los sacerdotes?', 'Fácil', 'En Age of Empires (1997), los sacerdotes convertían unidades enemigas a tu bando.'),
(9, 8, '¿Qué simulador de vida fue diseñado originalmente por Will Wright?', 'Fácil', 'Lanzado en el año 2000, The Sims permite construir casas y controlar la vida de personajes virtuales.'),
(10, 9, '¿Qué saga de PlayStation se promociona como The Real Driving Simulator?', 'Fácil', 'Gran Turismo destaca por el realismo físico de sus autos y circuitos reales.'),
(11, 10, '¿En qué año se lanzó el primer FIFA International Soccer de EA Sports?', 'Fácil', 'El primer FIFA salió a fines de 1993 con vista isométrica y selecciones nacionales.');

-- Insertar las 4 opciones para cada pregunta
INSERT INTO opciones (pregunta_id, texto_opcion, es_correcta) VALUES
(1, 'Capcom', 0), (1, 'Team Silent (Konami)', 1), (1, 'Square Enix', 0), (1, 'Naughty Dog', 0),
(2, '1996', 1), (2, '1998', 0), (2, '2000', 0), (2, '1994', 0),
(3, 'El Continente', 1), (3, 'Tamriel', 0), (3, 'Hyrule', 0), (3, 'Azeroth', 0),
(4, 'Nathan Drake', 1), (4, 'Lara Croft', 0), (4, 'Arthur Morgan', 0), (4, 'Indiana Jones', 0),
(5, 'de_dust2', 1), (5, 'Nuketown', 0), (5, 'Blood Gulch', 0), (5, 'Shipment', 0),
(6, 'Street Fighter', 1), (6, 'Mortal Kombat', 0), (6, 'Tekken', 0), (6, 'King of Fighters', 0),
(7, '1985', 1), (7, '1983', 0), (7, '1990', 0), (7, '1988', 0),
(8, 'Age of Empires', 1), (8, 'StarCraft', 0), (8, 'Warcraft III', 0), (8, 'Civilization', 0),
(9, 'The Sims', 1), (9, 'Animal Crossing', 0), (9, 'Second Life', 0), (9, 'Habbo', 0),
(10, 'Gran Turismo', 1), (10, 'Need for Speed', 0), (10, 'Burnout', 0), (10, 'Mario Kart', 0),
(11, '1993', 1), (11, '1998', 0), (11, '2000', 0), (11, '1990', 0);