# 🎮 Press Start Quiz

Juego web de trivia sobre videojuegos con estética arcade/neón, sistema de economía interna, tienda de comodines, ranking persistente en la nube y **Modo Multijugador 1v1 en tiempo real**.

🔗 **Demo en vivo:** [press-start-quiz.vercel.app](https://press-start-quiz.vercel.app)

---

## 🛠️ Arquitectura y Tecnologías

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS) + Web Audio API (efectos de sonido retro 8-bits).
* **Backend:** Serverless Functions en **Vercel** (`/api/`).
* **Base de Datos:** **MySQL** alojado en **Aiven Cloud**.

---

## ✨ Funcionalidades Principales

* **10 Géneros de Videojuegos:** Survival Horror, RPG, Acción y Aventura, Shooter, Lucha, Plataformas, Estrategia, Simulación, Carreras y Deportes.
* **Modos de Juego:** Fácil, Media, Difícil, Todas, **Modo Infinito** y **Duelo Multijugador 1v1** por salas con código.
* **Aleatorización Dinámica (Fisher-Yates):** Las opciones de respuesta se mezclan en cada pregunta.
* **Feedback Pedagógico:** Explicación histórica tras responder cada pregunta.
* **Tienda y Comodines:** Compra y uso de *50/50*, *Escudo*, *Saltar* y *x2 Puntos* sincronizados con el saldo del usuario.
* **Ranking Top 10:** Tabla de posiciones global en tiempo real.

---

## 🗄️ Estructura de la Base de Datos (MySQL)

El esquema relacional completo también se encuentra disponible para importar en el archivo [`database.sql`](./database.sql).

```sql
CREATE DATABASE IF NOT EXISTS press_start_quiz;
USE press_start_quiz;

-- 1. Usuarios y puntajes globales
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    puntos_totales INT DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categorías de videojuegos
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 3. Banco de preguntas
CREATE TABLE IF NOT EXISTS preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    enunciado TEXT NOT NULL,
    dificultad VARCHAR(20) DEFAULT 'Fácil',
    explicacion TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

-- 4. Opciones por pregunta
CREATE TABLE IF NOT EXISTS opciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pregunta_id INT NOT NULL,
    texto_opcion VARCHAR(255) NOT NULL,
    es_correcta BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE CASCADE
);

-- 5. Historial de partidas individuales
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

-- 6. Salas para Modo Multijugador 1v1 en tiempo real
CREATE TABLE IF NOT EXISTS salas_multijugador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_sala VARCHAR(10) NOT NULL UNIQUE,
    categoria VARCHAR(100) NOT NULL,
    preguntas_json LONGTEXT NOT NULL,
    jugador1_nick VARCHAR(50) NOT NULL,
    jugador1_puntos INT DEFAULT 0,
    jugador1_termino TINYINT(1) DEFAULT 0,
    jugador2_nick VARCHAR(50) DEFAULT NULL,
    jugador2_puntos INT DEFAULT 0,
    jugador2_termino TINYINT(1) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'esperando',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);