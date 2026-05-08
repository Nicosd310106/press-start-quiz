const questions = [
    { q: "¿Quién es el protagonista de The Legend of Zelda?", options: ["Zelda", "Link", "Ganon", "Tingle"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el bloque principal de Minecraft?", options: ["Diamante", "Pasto", "Tierra", "Piedra"], correct: 2, level: "Fácil" },
    { q: "¿En qué año se lanzó Resident Evil 4 (Original)?", options: ["2004", "2005", "2006", "2003"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama el padre de Kratos en God of War?", options: ["Ares", "Zeus", "Hades", "Poseidón"], correct: 1, level: "Media" },
    { q: "¿Cuál fue el primer nombre de Mario?", options: ["Jumpman", "Mr. Video", "Plumber Man", "Luigi"], correct: 0, level: "Difícil" },
    { q: "¿Qué estudio desarrolló el juego 'Bloodborne'?", options: ["Bluepoint", "FromSoftware", "Team Cherry", "Ubisoft"], correct: 1, level: "Difícil" }
];

let bancoMezclado = [];
let currentIndex = 0;
let score = 0;

const menuEl = document.getElementById("menu");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

function barajar(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        const nivel = btn.dataset.level;
        iniciarQuiz(nivel);
    });
});

function iniciarQuiz(nivel) {
    if (nivel === "Todas") {
        bancoMezclado = barajar(questions);
    } else {
        bancoMezclado = barajar(questions.filter(q => q.level === nivel));
    }

    score = 0;
    currentIndex = 0;
    document.getElementById("score-display").innerText = "Puntos: 0";
    
    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";

    loadQuestion();
}

function loadQuestion() {
    const q = bancoMezclado[currentIndex];
    document.getElementById("question").innerText = q.q;
    document.getElementById("difficulty-badge").innerText = q.level;
    
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
            quizArea.innerHTML = "<h2>¡GG! Completaste el Quiz</h2><button class='btn-option' onclick='volverAlMenu()'>Menú</button>";
        }
    } else {
        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;
    }
}

function volverAlMenu() {
    quizArea.innerHTML = '<h2 id="question"></h2><div id="options-container"></div>';
    gameEl.style.display = "none";
    menuEl.style.display = "block";
}
