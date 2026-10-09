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

document.querySelectorAll(".btn-genre").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedGenre = btn.getAttribute("data-genre");
        document.getElementById("selected-genre-label").innerText = selectedGenre;
        genreSelection.style.display = "none";
        difficultySelection.style.display = "block";
    });
});

document.getElementById("btn-back-genre").addEventListener("click", () => {
    difficultySelection.style.display = "none";
    genreSelection.style.display = "block";
});

document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedLevel = btn.getAttribute("data-level");
        nivelActualLabel = `${selectedGenre} - ${selectedLevel}`;
        iniciarQuiz(selectedGenre, selectedLevel);
    });
});

async function iniciarQuiz(genre, level) {
    score = 0;
    currentIndex = 0;

    document.getElementById("score-display").innerText = "Puntos: 0";
    document.getElementById("difficulty-badge").innerText = nivelActualLabel; 

    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";

    document.getElementById("question").innerText = "Generando preguntas con IA...";
    document.getElementById("options-container").innerHTML = `
        <p style="text-align: center; color: #00feff; font-size: 1.1rem; margin-top: 20px;">
            Conectando con el servidor arcade... 🎮
        </p>
    `;

    try {
        const response = await fetch('/api/generar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genre, level })
});

const texto = await response.text();
let data;
try {
    data = JSON.parse(texto);
} catch {
    throw new Error(`El servidor respondió ${response.status}: ${texto.slice(0, 150)}`);
}

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detalle || data.error || "Error desconocido en el servidor");
        }

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("El formato recibido no es válido.");
        }

        bancoMezclado = data;
        loadQuestion();

    } catch (error) {
        console.error("Error:", error);
        quizArea.innerHTML = `
            <h2 style="color: #ff003c;">ERROR:</h2>
            <p style="font-size: 0.9rem; color: #fff;">${error.message}</p>
            <button class='btn-option' onclick='volverAlMenu()'>VOLVER AL MENÚ</button>
        `;
    }
}

function loadQuestion() {
    if (!bancoMezclado || bancoMezclado.length === 0) return;

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

function checkAnswer(index) {
    if (index === bancoMezclado[currentIndex].correct) {
        score += 10;
        document.getElementById("score-display").innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            quizArea.innerHTML = `
                <h2 style="color: #00feff; text-shadow: 0 0 10px #00feff;">¡GG! RONDA SUPERADA</h2>
                <p style="font-size: 1.5rem; margin: 20px 0;">Puntaje final: ${score}</p>
                <button class='btn-option' onclick='volverAlMenu()'>INSERT COIN (VOLVER)</button>
            `;
        }
    } else {
        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;
    }
}

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
    genreSelection.style.display = "block";
    menuEl.style.display = "block";
}
