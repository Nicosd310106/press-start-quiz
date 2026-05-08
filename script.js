const questions = [
    { q: "¿Quién es el protagonista de Zelda?", options: ["Zelda", "Link", "Ganon", "Tingle"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el bloque principal de Minecraft?", options: ["Diamante", "Pasto", "Tierra", "Piedra"], correct: 2, level: "Fácil" },
    { q: "¿Año de Resident Evil 4?", options: ["2004", "2005", "2006", "2003"], correct: 1, level: "Media" },
    { q: "¿Padre de Kratos?", options: ["Ares", "Zeus", "Hades", "Poseidón"], correct: 1, level: "Media" },
    { q: "¿Primer nombre de Mario?", options: ["Jumpman", "Mr. Video", "Plumber Man", "Luigi"], correct: 0, level: "Difícil" },
    { q: "¿Estudio de Bloodborne?", options: ["Bluepoint", "FromSoftware", "Team Cherry", "Ubisoft"], correct: 1, level: "Difícil" }
];

let bancoMezclado = [];
let currentIndex = 0;
let score = 0;

const menuEl = document.getElementById("menu");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        const nivel = btn.dataset.level;
        iniciarQuiz(nivel);
    });
});

function iniciarQuiz(nivel) {
    if (nivel === "Todas") {
        bancoMezclado = [...questions].sort(() => Math.random() - 0.5);
    } else {
        bancoMezclado = questions.filter(q => q.level === nivel).sort(() => Math.random() - 0.5);
    }
    score = 0;
    currentIndex = 0;
    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";
    loadQuestion();
}

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

function checkAnswer(i) {
    if (i === bancoMezclado[currentIndex].correct) {
        score += 10;
        document.getElementById("score-display").innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) loadQuestion();
        else {
            quizArea.innerHTML = "<h2>¡GG!</h2><button class='btn-option' onclick='volverAlMenu()'>Menú</button>";
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
    gameEl.style.display = "none";
    menuEl.style.display = "block";
}
