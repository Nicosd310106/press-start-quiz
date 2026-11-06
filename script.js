let selectedGenre = "";
let selectedLevel = "";
let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = "";

// Modificadores activos por comodín
let multiplicadorPuntos = 1;
let escudoActivo = false;

document.addEventListener("DOMContentLoaded", () => {
    try {
        const usuarioActual = localStorage.getItem("press_start_usuario_actual");

        if (!usuarioActual) {
            window.location.href = "login.html";
            return;
        }

        console.log("Sesión activa para:", usuarioActual);

        obtenerPuntosUsuario();

        // Selección de género
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

        // Botón volver a géneros
        const btnBackGenre = document.getElementById("btn-back-genre");
        if (btnBackGenre) {
            btnBackGenre.addEventListener("click", () => {
                const genreSel = document.getElementById("genre-selection");
                const diffSel = document.getElementById("difficulty-selection");
                if (diffSel) diffSel.style.display = "none";
                if (genreSel) genreSel.style.display = "block";
            });
        }

        // Selección de dificultad
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
        console.error("Error en arranque:", e);
    }
});

async function obtenerPuntosUsuario() {
    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem("press_start_usuario_actual");
    if (!userId && !usuarioActual) return;

    try {
        const res = await fetch('/api/ranking');
        if (res.ok) {
            const data = await res.json();
            if (data.ranking && Array.isArray(data.ranking)) {
                const usuario = data.ranking.find(u => u.id == userId || u.nickname === usuarioActual);
                if (usuario) {
                    refrescarUIConPuntos(usuario.puntos_totales);
                }
            }
        }
    } catch (err) {
        console.warn("No se pudieron cargar los puntos del usuario.");
    }
}

function refrescarUIConPuntos(puntos) {
    const ptsNum = parseInt(puntos, 10) || 0;

    if (typeof Tienda !== "undefined") {
        Tienda.puntosDisponibles = ptsNum;
        Tienda.guardarDatos();
    }

    const tiendaPtsSpan = document.getElementById("tienda-puntos-menu");
    if (tiendaPtsSpan) {
        tiendaPtsSpan.innerText = ptsNum;
    }

    const shopPointsDisp = document.getElementById("shop-points-display");
    if (shopPointsDisp) {
        shopPointsDisp.innerText = ptsNum;
    }
}

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
        }
    } catch (error) {
        console.warn("No se pudo obtener el ranking.");
    }
}

async function guardarPuntosEnBD(puntajeObtenido) {
    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem('press_start_usuario_actual');
    
    if (puntajeObtenido <= 0) return;

    const genreLower = (selectedGenre || "").toLowerCase();
    let catId = 1;
    if (genreLower.includes("rpg")) catId = 2;
    else if (genreLower.includes("acción") || genreLower.includes("aventura")) catId = 3;
    else if (genreLower.includes("shooter") || genreLower.includes("disparos")) catId = 4;
    else if (genreLower.includes("lucha") || genreLower.includes("peleas")) catId = 5;
    else if (genreLower.includes("plataforma")) catId = 6;

    try {
        const res = await fetch('/api/partida', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId ? parseInt(userId, 10) : null,
                nickname: usuarioActual,
                categoriaId: catId,
                dificultad: selectedLevel || "Fácil",
                puntosObtenidos: puntajeObtenido
            })
        });

        if (res.ok) {
            const data = await res.json();
            console.log("Puntos sincronizados en Aiven:", data);

            if (data.puntosTotales !== undefined) {
                refrescarUIConPuntos(data.puntosTotales);
            } else {
                await obtenerPuntosUsuario();
            }
        }
    } catch (error) {
        console.error("Error al registrar puntos en MySQL:", error);
    }
}

async function fetchPreguntasBD(genre, level) {
    const genreLower = (genre || "").toLowerCase();
    let categoriaId = 1;

    if (genreLower.includes("survival") || genreLower.includes("horror")) {
        categoriaId = 1;
    } else if (genreLower.includes("rpg")) {
        categoriaId = 2;
    } else if (genreLower.includes("acción") || genreLower.includes("accion") || genreLower.includes("aventura")) {
        categoriaId = 3;
    } else if (genreLower.includes("shooter") || genreLower.includes("disparos")) {
        categoriaId = 4;
    } else if (genreLower.includes("lucha") || genreLower.includes("peleas")) {
        categoriaId = 5;
    } else if (genreLower.includes("plataforma") || genreLower.includes("plataformas")) {
        categoriaId = 6;
    }

    const dificultadNormalizada = (level || "Fácil")
        .toLowerCase()
        .replace("á", "a")
        .replace("í", "i");

    try {
        const response = await fetch(`/api/preguntas?categoria_id=${categoriaId}&dificultad=${dificultadNormalizada}`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.preguntas) && data.preguntas.length > 0) {
                return data.preguntas;
            }
        }
    } catch (e) {
        console.warn("API /api/preguntas no disponible...");
    }

    try {
        const responseAlt = await fetch("/api/generar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ genre, level, count: 5 })
        });
        if (responseAlt.ok) {
            const dataAlt = await responseAlt.json();
            if (Array.isArray(dataAlt) && dataAlt.length > 0) {
                return dataAlt;
            }
        }
    } catch (e) {
        console.warn("Fallback /api/generar no respondió.");
    }

    throw new Error(`No se pudieron obtener preguntas para ${genre} (${level}).`);
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

    quizArea.innerHTML = `
        <div id="difficulty-badge" class="badge">${nivelActualLabel}</div>
        <h2 id="question">Cargando preguntas de la BD...</h2>
        <div id="options-container" class="options-grid">
            <p style="text-align: center; color: #00feff; font-size: 1.1rem;">Conectando con la base de datos... 🎮</p>
        </div>
    `;

    try {
        bancoMezclado = await fetchPreguntasBD(genre, level);
        loadQuestion();
    } catch (error) {
        console.error("Error al iniciar el Quiz:", error);
        if (quizArea) {
            quizArea.innerHTML = `
                <h2 style="color: #ff003c;">ERROR</h2>
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

    if (typeof Tienda !== "undefined") {
        Tienda.actualizarUI();
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
        const puntosGanados = (10 * multiplicadorPuntos);
        score += puntosGanados;
        multiplicadorPuntos = 1; // Resetea el multiplicador tras usarse

        const scoreDisp = document.getElementById("score-display");
        if (scoreDisp) scoreDisp.innerText = `Puntos: ${score}`;

        guardarPuntosEnBD(puntosGanados);

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
        if (escudoActivo) {
            escudoActivo = false;
            alert("🛡️ ¡El escudo absorbió el error!");
            return;
        }

        const quizArea = document.getElementById("quiz");
        const gameOverScreen = document.getElementById("game-over-screen");
        if (quizArea) quizArea.style.display = "none";
        if (gameOverScreen) gameOverScreen.style.display = "block";
        const scoreOver = document.getElementById("score-over");
        if (scoreOver) scoreOver.innerText = score;
    }
}

// -------------------------------------------------------------
// LÓGICA DE EJECUCIÓN DE COMODINES EN PARTIDA
// -------------------------------------------------------------
function usarComodin(tipo) {
    if (typeof Tienda === "undefined") return;

    // Verificar si el jugador posee el comodín
    if (!Tienda.inventario[tipo] || Tienda.inventario[tipo] <= 0) {
        alert("¡No tienes este comodín en tu inventario! Cómpralo en la Tienda.");
        return;
    }

    const q = bancoMezclado[currentIndex];
    if (!q) return;

    if (tipo === 'mitad') {
        // COMODÍN 50/50: Elimina 2 opciones incorrectas del DOM
        const container = document.getElementById("options-container");
        if (!container) return;
        const botones = Array.from(container.querySelectorAll("button"));
        
        const opciones = q.opciones || q.options;
        let eliminadas = 0;

        botones.forEach((btn, idx) => {
            const opt = opciones[idx];
            let esCorrecta = false;
            if (typeof opt === 'object') {
                esCorrecta = (opt.es_correcta === 1 || opt.es_correcta === true);
            } else {
                esCorrecta = (idx === q.correct);
            }

            if (!esCorrecta && eliminadas < 2) {
                btn.style.visibility = "hidden"; // Oculta la opción incorrecta
                eliminadas++;
            }
        });

        Tienda.usarItem('mitad');

    } else if (tipo === 'escudo') {
        // COMODÍN ESCUDO: Te perdona un fallo en la ronda
        escudoActivo = true;
        Tienda.usarItem('escudo');
        alert("🛡️ ¡Escudo activado! Te protegerá en tu siguiente fallo.");

    } else if (tipo === 'saltar') {
        // COMODÍN SALTAR: Pasa de pregunta sin perder
        Tienda.usarItem('saltar');
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

    } else if (tipo === 'doble') {
        // COMODÍN x2 PTS: Duplica el puntaje del siguiente acierto
        multiplicadorPuntos = 2;
        Tienda.usarItem('doble');
        alert("✨ ¡Doble puntuación activada para el próximo acierto!");
    }
}

async function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];

    const gameEl = document.getElementById("game");
    const gameOverScreen = document.getElementById("game-over-screen");
    const menuEl = document.getElementById("menu");
    const genreSelection = document.getElementById("genre-selection");
    const diffSelection = document.getElementById("difficulty-selection");
    const quizArea = document.getElementById("quiz");

    if (quizArea) {
        quizArea.style.display = "block";
        quizArea.innerHTML = "";
    }

    if (gameEl) gameEl.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    if (diffSelection) diffSelection.style.display = "none";
    if (genreSelection) genreSelection.style.display = "block";
    if (menuEl) menuEl.style.display = "block";

    await obtenerPuntosUsuario();
    await cargarRanking();
}

function cerrarSesion() {
    localStorage.removeItem("press_start_usuario_actual");
    localStorage.removeItem("press_start_user_id");
    window.location.href = "login.html";
}