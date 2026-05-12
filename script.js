const questions = [
    { q: "¿Quién es el protagonista de The Legend of Zelda?", options: ["Zelda", "Link", "Ganon", "Tingle"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el bloque principal de Minecraft?", options: ["Diamante", "Pasto", "Tierra", "Piedra"], correct: 1, level: "Fácil" },
    { q: "¿En qué consola debutó Super Mario Bros?", options: ["NES", "Sega Genesis", "Atari", "SNES"], correct: 0, level: "Fácil" },
    { q: "¿Cómo se llama el dinosaurio verde de Mario?", options: ["Poochy", "Yoshi", "Birdo", "Koopa"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el color de Pac-Man?", options: ["Rojo", "Azul", "Amarillo", "Verde"], correct: 2, level: "Fácil" },
    { q: "¿Qué animal es Sonic?", options: ["Gato", "Erizo", "Zorro", "Perro"], correct: 1, level: "Fácil" },
    { q: "¿En qué año se lanzó Resident Evil 4 (Original)?", options: ["2004", "2005", "2006", "2003"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama el padre de Kratos en God of War?", options: ["Ares", "Zeus", "Hades", "Poseidón"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama la ciudad donde ocurre GTA V?", options: ["Liberty City", "Vice City", "Los Santos", "San Fierro"], correct: 2, level: "Media" },
    { q: "¿Cuál es el nombre real de Master Chief en Halo?", options: ["John", "Cortana", "Arbiter", "Marcus"], correct: 0, level: "Media" },
    { q: "¿Quién creó la serie Metal Gear?", options: ["Shigeru Miyamoto", "Hideo Kojima", "Shinji Mikami", "Eiji Aonuma"], correct: 1, level: "Media" },
    { q: "¿Cuál fue el primer nombre de Mario?", options: ["Jumpman", "Mr. Video", "Plumber Man", "Luigi"], correct: 0, level: "Difícil" },
    { q: "¿Qué estudio desarrolló el juego 'Bloodborne'?", options: ["Bluepoint", "FromSoftware", "Team Cherry", "Ubisoft"], correct: 1, level: "Difícil" },
    { q: "¿En qué año salió la primera PlayStation en Japón?", options: ["1992", "1994", "1995", "1993"], correct: 1, level: "Difícil" },
    { q: "¿Cuál fue el primer juego en usar la tecnología Mode 7?", options: ["Super Mario World", "F-Zero", "Star Fox", "Pilotwings"], correct: 1, level: "Difícil" },
    { q: "¿Cómo se llamaba la empresa antes de ser Nintendo?", options: ["Marufuku", "Yamauchi Co.", "Nintendo Playing Card", "Hanafuda Corp"], correct: 0, level: "Difícil" }
];

let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = ""; 

const menuEl = document.getElementById("menu");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

// 1. ESCUCHAR CLICS EN BOTONES
document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        nivelActualLabel = btn.getAttribute("data-level"); // Guardar dificultad elegida
        iniciarQuiz(nivelActualLabel);
    });
});

// 2. INICIAR EL JUEGO
function iniciarQuiz(nivel) {
    if (nivel === "Todas") {
        bancoMezclado = [...questions].sort(() => Math.random() - 0.5);
    } else {
        bancoMezclado = questions.filter(q => q.level === nivel).sort(() => Math.random() - 0.5);
    }

    score = 0;
    currentIndex = 0;
    
    // Forzar el texto correcto en el cartel azul
    document.getElementById("score-display").innerText = "Puntos: 0";
    document.getElementById("difficulty-badge").innerText = nivelActualLabel; 
    
    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";

    loadQuestion();
}

// 3. CARGAR PREGUNTA (SIN TOCAR EL BADGE)
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

// 4. CHEQUEAR RESPUESTA
function checkAnswer(index) {
    if (index === bancoMezclado[currentIndex].correct) {
        score += 10;
        document.getElementById("score-display").innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            // Pantalla de Ganador
            quizArea.innerHTML = `
                <h2 style="color: #00feff;">¡GG! Completaste el Quiz</h2>
                <p style="font-size: 1.5rem;">Puntaje final: ${score}</p>
                <button class='btn-option' onclick='volverAlMenu()'>VOLVER AL MENÚ</button>
            `;
        }
    } else {
        // Pantalla de Perdedor
        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;
    }
}

// 5. RESETEAR TODO PARA VOLVER A JUGAR
function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    
    // Reconstruir el HTML que borramos al ganar
    quizArea.innerHTML = `
        <h2 id="question">Cargando pregunta...</h2>
        <div id="options-container"></div>
    `;
    
    gameEl.style.display = "none";
    gameOverScreen.style.display = "none";
    menuEl.style.display = "block";
}
