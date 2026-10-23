let selectedGenre = "";
let selectedLevel = "";
let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = "";

// Modificadores activos por pregunta
let multiplicadorPuntos = 1;
let escudoActivo = false;

// Verificación de sesión e inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    try {
        const usuarioActual = localStorage.getItem("press_start_usuario_actual");

        // Si no ha iniciado sesión, redirige a login.html
        if (!usuarioActual) {
            window.location.href = "login.html";
            return;
        }

        console.log("Sesión activa para el jugador:", usuarioActual);

        // Asignar eventos de géneros
        document.querySelectorAll(".btn-genre").forEach(btn => {
            btn.addEventListener("click", () => {
                selectedGenre = btn.getAttribute("data-genre");
                const labelEl = document.getElementById("selected-genre-label");
                if (labelEl) labelEl.innerText = selectedGenre;
                
                const genreSel = document.getElementById("genre-selection");
                const diffSel = document.getElementById("difficulty-selection");
                if (genreSel) genreSel.style.display = "none";
                if (diffSel) diffSel.style.display = "block";
            });
        });

        // Volver a selección de género
        const btnBackGenre = document.getElementById("btn-back-genre");
        if (btnBackGenre) {
            btnBackGenre.addEventListener("click", () => {
                const genreSel = document.getElementById("genre-selection");
                const diffSel = document.getElementById("difficulty-selection");
                if (diffSel) diffSel.style.display = "none";
                if (genreSel) genreSel.style.display = "block";
            });
        }

        // Botones de dificultad
        document.querySelectorAll(".btn-difficulty").forEach(btn => {
            btn.addEventListener("click", () => {
                selectedLevel = btn.getAttribute("data-level");
                nivelActualLabel = `${selectedGenre} - ${selectedLevel}`;
                iniciarQuiz(selectedGenre, selectedLevel);
            });
        });

        // Llamada segura a la tienda
        if (typeof actualizarPantallaTienda === "function") {
            actualizarPantallaTienda();
        }

        // Cargar la tabla de posiciones desde MySQL o fallback
        cargarRanking();

    } catch (e) {
        console.error("Error durante el arranque de la app:", e);
    }
});

// Reproducir sonido de clic global
document.addEventListener("click", (e) => {
    try {
        if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
            if (typeof Sonidos !== 'undefined' && typeof Sonidos.playClic === 'function') {
                Sonidos.playClic();
            }
        }
    } catch (err) {
        // Ignorar si el audio falla
    }
});

async function cargarRanking() {
    const listaEl = document.getElementById("ranking-lista");
    if (!listaEl) return;

    try {
        const res = await fetch('/api/ranking');
        const data = await res.json();

        if (res.ok && data.ranking && data.ranking.length > 0) {
            listaEl.innerHTML = "";
            data.ranking.forEach((jugador) => {
                const li = document.createElement("li");
                li.style.margin = "4px 0";
                li.innerHTML = `<strong>${jugador.nickname}</strong>: <span style="color:#00feff;">${jugador.puntos_totales} pts</span>`;
                listaEl.appendChild(li);
            });
        } else {
            listaEl.innerHTML = "<li>No hay puntajes registrados aún.</li>";
        }
    } catch (error) {
        listaEl.innerHTML = "<li>Modo local o MySQL offline. ¡Inicia una partida!</li>";
    }
}

async function fetchPreguntasServerless(genre, level, count = 10, exclude = []) {
    const response = await fetch("/api/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, level, count, exclude })
    });

    const texto = await response.text();
    let data;
    try {
        data = JSON.parse(texto);
    } catch {
        throw new Error(`El servidor respondió con un error (${response.status})`);
    }

    if (!response.ok) {
        throw new Error(data.detalle || data.error || "Error en el servidor");
    }

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("El formato de preguntas recibido no es válido.");
    }

    return data;
}

async function iniciarQuiz(genre, level) {
    score = 0;
    currentIndex = 0;
    multiplicadorPuntos = 1;
    escudoActivo = false;

    const scoreDisp = document.getElementById("score-display");
    const diffBadge = document.getElementById("difficulty-badge");
    if (scoreDisp) scoreDisp.innerText = "Puntos: 0";
    if (diffBadge) diffBadge.innerText = nivelActualLabel;

    const isInfinite = (level === "Infinito");

    const menuEl = document.getElementById("menu");
    const gameEl = document.getElementById("game");
    const quizArea = document.getElementById("quiz");
    const gameOverScreen = document.getElementById("game-over-screen");

    if (menuEl) menuEl.style.display = "none";
    if (gameEl) gameEl.style.display = "block";
    if (quizArea) quizArea.style.display = "block";
    if (gameOverScreen) gameOverScreen.style.display = "none";

    const qEl = document.getElementById("question");
    const optContainer = document.getElementById("options-container");
    if (qEl) qEl.innerText = "Generando preguntas con IA...";
    if (optContainer) {
        optContainer.innerHTML = `<p style="text-align: center; color: #00feff; font-size: 1.1rem;">Conectando con el servidor arcade... 🎮</p>`;
    }

    try {
        bancoMezclado = await fetchPreguntasServerless(genre, level, isInfinite ? 5 : 10);
        loadQuestion();
    } catch (error) {
        console.error("Error al iniciar el Quiz:", error);
        if (quizArea) {
            quizArea.innerHTML = `
                <h2 style="color: #ff003c;">ERROR:</h2>
                <p style="font-size: 0.9rem; color: #fff;">${error.message}</p>
                <button class="btn-option" onclick="volverAlMenu()">VOLVER AL MENÚ</button>
            `;
        }
    }
}

function loadQuestion() {
    if (!bancoMezclado || currentIndex >= bancoMezclado.length) return;
    const q = bancoMezclado[currentIndex];

    const qEl = document.getElementById("question");
    const container = document.getElementById("options-container");
    if (qEl) qEl.innerText = q.q;
    if (container) {
        container.innerHTML = "";
        q.options.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.className = "btn-option";
            btn.dataset.index = i;
            btn.onclick = () => checkAnswer(i, q);
            container.appendChild(btn);
        });
    }
}

function checkAnswer(index, q) {
    if (index === q.correct) {
        score += 10;
        const scoreDisp = document.getElementById("score-display");
        if (scoreDisp) scoreDisp.innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            const quizArea = document.getElementById("quiz");
            if (quizArea) {
                quizArea.innerHTML = `
                    <h2 style="color: #00feff;">¡GG! RONDA SUPERADA</h2>
                    <p style="font-size: 1.5rem;">Puntaje final: ${score}</p>
                    <button class="btn-option" onclick="volverAlMenu()">VOLVER AL MENÚ</button>
                `;
            }
        }
    } else {
        const quizArea = document.getElementById("quiz");
        const gameOverScreen = document.getElementById("game-over-screen");
        if (quizArea) quizArea.style.display = "none";
        if (gameOverScreen) gameOverScreen.style.display = "block";
        const scoreOver = document.getElementById("score-over");
        if (scoreOver) scoreOver.innerText = score;
    }
}

function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];

    const gameEl = document.getElementById("game");
    const gameOverScreen = document.getElementById("game-over-screen");
    const menuEl = document.getElementById("menu");
    const genreSelection = document.getElementById("genre-selection");

    if (gameEl) gameEl.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    if (genreSelection) genreSelection.style.display = "block";
    if (menuEl) menuEl.style.display = "block";

    cargarRanking();
}

function cerrarSesion() {
    localStorage.removeItem("press_start_usuario_actual");
    window.location.href = "login.html";
}