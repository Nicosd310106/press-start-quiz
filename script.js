let selectedGenre = "";
let selectedLevel = "";
let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = ""; 

const menuEl = document.getElementById("menu");
const genreSelection = document.getElementById("genre-selection");
const difficultySelection = document.getElementById("difficulty-selection");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

// 1. ESCUCHAR CLICS EN LOS BOTONES DE GÉNERO
document.querySelectorAll(".btn-genre").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedGenre = btn.getAttribute("data-genre");
        document.getElementById("selected-genre-label").innerText = selectedGenre;
        
        // Ocultar sección de género y mostrar la de dificultad
        genreSelection.style.display = "none";
        difficultySelection.style.display = "block";
    });
});

// BOTÓN PARA VOLVER ATRÁS (Cambiar de género)
document.getElementById("btn-back-genre").addEventListener("click", () => {
    difficultySelection.style.display = "none";
    genreSelection.style.display = "block";
});

// 2. ESCUCHAR CLICS EN LOS BOTONES DE DIFICULTAD
document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedLevel = btn.getAttribute("data-level");
        nivelActualLabel = `${selectedGenre} - ${selectedLevel}`;
        
        iniciarQuiz(selectedGenre, selectedLevel);
    });
});

// 3. INICIAR EL JUEGO (Filtrando por Género y Dificultad)
function iniciarQuiz(genre, level) {
    // NOTA: Por ahora, como todavía estamos adaptando la estructura, 
    // usaremos un filtro local o simulado. En el siguiente paso conectaremos la API.
    
    // Si tenías un array de preguntas local, aquí haríamos el filtro:
    // const filtradas = questions.filter(q => q.genre === genre && (level === "Todas" || q.level === level));
    
    score = 0;
    currentIndex = 0;

    document.getElementById("score-display").innerText = "Puntos: 0";
    document.getElementById("difficulty-badge").innerText = nivelActualLabel; 

    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";

    // Simulamos unas preguntas iniciales para probar que la navegación funcione perfecta en el celu
    bancoMezclado = [
        { q: `Pregunta de prueba 1 sobre ${genre} (${level})`, options: ["Opción A", "Opción B", "Opción C", "Opción D"], correct: 1 },
        { q: `Pregunta de prueba 2 sobre ${genre} (${level})`, options: ["Opción 1", "Opción 2", "Opción 3", "Opción 4"], correct: 0 }
    ];

    loadQuestion();
}

// 4. CARGAR PREGUNTA
function loadQuestion() {
    const q = bancoMezclado[currentIndex];
    document.getElementById("question").innerText = q.q;

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.className = "btn-option";
        btn.onclick = () => checkAnswer(i);
        container.appendChild(btn);
    });
}

// 5. CHEQUEAR RESPUESTA
function checkAnswer(index) {
    if (index === bancoMezclado[currentIndex].correct) {
        score += 10;
        document.getElementById("score-display").innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            // Pantalla de Victoria / Fin del bloque de prueba
            quizArea.innerHTML = `
                <h2 style="color: #00feff;">¡GG! Completaste esta ronda</h2>
                <p style="font-size: 1.5rem;">Puntaje final: ${score}</p>
                <button class='btn-option' onclick='volverAlMenu()'>VOLVER AL MENÚ</button>
            `;
        }
    } else {
        // Pantalla de Perdedor (Game Over)
        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;
    }
}

// 6. RESETEAR TODO PARA VOLVER AL MENÚ
function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    selectedGenre = "";
    selectedLevel = "";

    quizArea.innerHTML = `
        <h2 id="question">Cargando pregunta...</h2>
        <div id="options-container"></div>
    `;

    gameEl.style.display = "none";
    gameOverScreen.style.display = "none";
    genreSelection.style.display = "block"; // Volver al paso 1 de géneros
    menuEl.style.display = "block";
}