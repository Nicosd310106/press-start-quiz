const questions = [
    // NIVEL FÁCIL
    { q: "¿Quién es el protagonista de The Legend of Zelda?", options: ["Zelda", "Link", "Ganon", "Tingle"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el bloque principal de Minecraft?", options: ["Diamante", "Pasto", "Tierra", "Piedra"], correct: 2, level: "Fácil" },

    // NIVEL MEDIO
    { q: "¿En qué año se lanzó Resident Evil 4 (Original)?", options: ["2004", "2005", "2006", "2003"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama el padre de Kratos en God of War?", options: ["Ares", "Zeus", "Hades", "Poseidón"], correct: 1, level: "Media" },

    // NIVEL DIFÍCIL
    { q: "¿Cuál fue el primer nombre de Mario?", options: ["Jumpman", "Mr. Video", "Plumber Man", "Luigi"], correct: 0, level: "Difícil" },
    { q: "¿Qué estudio desarrolló el juego 'Bloodborne'?", options: ["Bluepoint", "FromSoftware", "Team Cherry", "Ubisoft"], correct: 1, level: "Difícil" }
];

function barajarPreguntas(array) {
    let listaCopia = [...array];
    for (let i = listaCopia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [listaCopia[i], listaCopia[j]] = [listaCopia[j], listaCopia[i]];
    }
    return listaCopia;
}

let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelSeleccionado = "";

const menuEl = document.getElementById("menu");
const gameEl = document.getElementById("game");

document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        nivelSeleccionado = btn.dataset.level;
        iniciarQuiz(nivelSeleccionado);
    });
});

function iniciarQuiz(nivel) {
    let preguntasFiltradas;
    if (nivel === "Todas") {
        const faciles = barajarPreguntas(questions.filter(q => q.level === "Fácil"));
        const medias = barajarPreguntas(questions.filter(q => q.level === "Media"));
        const dificiles = barajarPreguntas(questions.filter(q => q.level === "Difícil"));
        preguntasFiltradas = [...faciles, ...medias, ...dificiles];
    } else {
        preguntasFiltradas = barajarPreguntas(questions.filter(q => q.level === nivel));
    }

    bancoMezclado = preguntasFiltradas;
    currentIndex = 0;
    score = 0;

    menuEl.style.display = "none";
    gameEl.style.display = "block";

    const scoreDisplay = document.getElementById("score-display");
    scoreDisplay.innerText = "Puntos: 0";

    loadQuestion();
}

function loadQuestion() {
    const currentQuestion = bancoMezclado[currentIndex];

    const questionEl = document.getElementById("question");
    const optionsContainer = document.getElementById("options-container");
    const difficultyBadge = document.getElementById("difficulty-badge");

    questionEl.innerText = currentQuestion.q;
    difficultyBadge.innerText = currentQuestion.level;
    optionsContainer.innerHTML = "";

    const letras = ["A", "B", "C", "D"];

    currentQuestion.options.forEach((opt, index) => {
        const btn = document.createElement("button");
        btn.innerText = `${letras[index]}) ${opt}`;
        btn.className = "btn-option";
        btn.onclick = () => checkAnswer(index);
        optionsContainer.appendChild(btn);
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
            document.getElementById("quiz").innerHTML = "<h2>¡GG! Completaste el Quiz</h2><p>Puntaje final: " + score + "</p><button class='btn-option' onclick='volverAlMenu()'>Volver al Menú</button>";
        }
    } else {
        alert("¡Game Over! Inténtalo de nuevo.");
        volverAlMenu();
    }
}

function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    document.getElementById("quiz").innerHTML = ' <h2 id="question">Cargando pregunta...</h2><div id="options-container"></div>';
    gameEl.style.display = "none";
    menuEl.style.display = "block";
    document.getElementById("game-over-screen").style.display = "none";
}

    document.getElementById("quiz").innerHTML = '<h2 id="question">Cargando pregunta...</h2><div id="options-container"></div>';

    gameEl.style.display = "none";
    menuEl.style.display = "block";
}
