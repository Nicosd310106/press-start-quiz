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

        if (typeof actualizarPantallaTienda === "function") {
            actualizarPantallaTienda();
        }

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

async function guardarPuntosEnBD(puntajeObtenido) {
    const userId = localStorage.getItem('press_start_user_id');
    if (!userId || puntajeObtenido <= 0) return;

    try {
        const res = await fetch('/api/partidas/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: parseInt(userId),
                dificultad: selectedLevel || 'Fácil',
                puntajeObtenido: puntajeObtenido
            })
        });

        const data = await res.json();
        if (res.ok) {
            console.log("Puntos acumulados guardados en MySQL:", data.puntosTotales);
            const tiendaPts = document.getElementById("tienda-puntos-menu");
            if (tiendaPts) tiendaPts.innerText = data.puntosTotales;
        }
    } catch (error) {
        console.error("Error al registrar puntos en MySQL:", error);
    }
}

async function fetchPreguntasBD(genre, level) {
    const mapaCategorias = {
        "Survival Horror": 1,
        "RPG": 2,
        "Acción y Aventura": 3,
        "Shooter / Disparos": 4,
        "Lucha / Peleas": 5,
        "Plataformas": 6
    };

    const categoriaId = mapaCategorias[genre] || 1;
    const dificultadNormalizada = (level || "Fácil").toLowerCase().replace("á", "a").replace("í", "i");

    try {
        const response = await fetch(`/api/preguntas?categoria_id=${categoriaId}&dificultad=${dificultadNormalizada}`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.preguntas) && data.preguntas.length > 0) {
                return data.preguntas;
            }
        }
    } catch (err) {
        console.warn("Fallo endpoint /api/preguntas, probando fallback...");
    }

    throw new Error("No se encontraron preguntas cargadas para esta categoría.");
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
    if (qEl) qEl.innerText = "Cargando preguntas de la BD...";
    if (optContainer) {
        optContainer.innerHTML = `<p style="text-align: center; color: #00feff; font-size: 1.1rem;">Conectando con la base de datos... 🎮</p>`;
    }

    try {
        bancoMezclado = await fetchPreguntasBD(genre, level);
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
    
    const enunciado = q.enunciado || q.q;
    const opciones = q.opciones || q.options;

    if (qEl) qEl.innerText = enunciado;
    if (container) {
        container.innerHTML = "";
        opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            const textoOpt = typeof opt === 'object' ? opt.texto_opcion : opt;
            btn.innerText = textoOpt;
            btn.className = "btn-option";
            btn.dataset.index = i;
            btn.onclick = () => checkAnswer(i, q);
            container.appendChild(btn);
        });
    }
}

function checkAnswer(index, q) {
    const opciones = q.opciones || q.options;
    const optSeleccionada = opciones[index];

    let esCorrecta = false;
    if (typeof optSeleccionada === 'object') {
        esCorrecta = (optSeleccionada.es_correcta === 1 || optSeleccionada.es_correcta === true);
    } else {
        esCorrecta = (index === q.correct);
    }

    if (esCorrecta) {
        score += (10 * multiplicadorPuntos);
        multiplicadorPuntos = 1;
        const scoreDisp = document.getElementById("score-display");
        if (scoreDisp) scoreDisp.innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            guardarPuntosEnBD(score);
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
        if (escudoActivo) {
            escudoActivo = false;
            alert("🛡️ ¡El escudo absorbió el error!");
            return;
        }
        guardarPuntosEnBD(score);
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
    const quizArea = document.getElementById("quiz");

    if (quizArea) {
        quizArea.style.display = "block";
        quizArea.innerHTML = `
            <div id="difficulty-badge" class="badge"></div>
            <h2 id="question">Cargando...</h2>
            <div id="options-container" class="options-grid"></div>
        `;
    }

    if (gameEl) gameEl.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    if (genreSelection) genreSelection.style.display = "block";
    if (menuEl) menuEl.style.display = "block";

    cargarRanking();
}

function cerrarSesion() {
    localStorage.removeItem("press_start_usuario_actual");
    localStorage.removeItem("press_start_user_id");
    window.location.href = "login.html";
}