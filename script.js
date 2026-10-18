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
window.addEventListener("DOMContentLoaded", () => {
    const usuarioActual = localStorage.getItem("press_start_usuario_actual");

    // Si no hay usuario logueado, redirige de inmediato a login.html
    if (!usuarioActual) {
        window.location.href = "login.html";
        return;
    }

    console.log("Sesión activa para el jugador:", usuarioActual);

    // Inicializar eventos de botones de género
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

    actualizarPantallaTienda();
});

// Reproducir sonido de clic global en cualquier botón
document.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        if (typeof Sonidos !== 'undefined') {
            Sonidos.playClic();
        }
    }
});

// Inicializar Modo Infinito si está disponible
if (typeof ModoInfinito !== 'undefined') {
    ModoInfinito.init(fetchPreguntasServerless);
}

// Función auxiliar para solicitar preguntas a Vercel/Gemini
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
        throw new Error(`El servidor respondió ${response.status}: ${texto.slice(0, 150)}`);
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
    
    if (isInfinite && typeof ModoInfinito !== 'undefined') {
        ModoInfinito.iniciarModo(genre);
        const streakBadge = document.getElementById("infinite-streak-badge");
        const streakDisp = document.getElementById("streak-display");
        if (streakBadge) streakBadge.style.display = "inline";
        if (streakDisp) streakDisp.innerText = "0";
    } else if (typeof ModoInfinito !== 'undefined') {
        ModoInfinito.desactivar();
        const streakBadge = document.getElementById("infinite-streak-badge");
        if (streakBadge) streakBadge.style.display = "none";
    }

    actualizarHUDTienda();

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
        optContainer.innerHTML = `
            <p style="text-align: center; color: #00feff; font-size: 1.1rem; margin-top: 20px;">
                Conectando con el servidor arcade... 🎮
            </p>
        `;
    }

    try {
        bancoMezclado = await fetchPreguntasServerless(genre, level, isInfinite ? 5 : 10);
        
        if (isInfinite && typeof ModoInfinito !== 'undefined') {
            ModoInfinito.preguntasBuffer = [...bancoMezclado];
            ModoInfinito.evaluarPrecarga(genre);
        }

        loadQuestion();

    } catch (error) {
        console.error("Error al iniciar el Quiz:", error);
        if (typeof Sonidos !== 'undefined') Sonidos.playError();
        
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
    let q;

    if (typeof ModoInfinito !== 'undefined' && ModoInfinito.activo) {
        q = ModoInfinito.obtenerSiguientePregunta();
        ModoInfinito.evaluarPrecarga(selectedGenre);
        
        if (!q && bancoMezclado.length > currentIndex) {
            q = bancoMezclado[currentIndex];
        }
    } else {
        if (!bancoMezclado || currentIndex >= bancoMezclado.length) return;
        q = bancoMezclado[currentIndex];
    }

    const quizArea = document.getElementById("quiz");

    if (!q) {
        if (quizArea) quizArea.innerHTML = `<h2 style="color: #ffe600;">Cargando más preguntas... ⚡</h2>`;
        setTimeout(() => loadQuestion(), 1000);
        return;
    }

    multiplicadorPuntos = 1;

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

    actualizarHUDTienda();
}

function checkAnswer(index, qObj) {
    const q = qObj || bancoMezclado[currentIndex];

    if (index === q.correct) {
        if (typeof Sonidos !== 'undefined') Sonidos.playAcierto();

        const puntosGanados = 10 * multiplicadorPuntos;
        score += puntosGanados;

        if (typeof Tienda !== 'undefined') {
            Tienda.sumarPuntos(puntosGanados);
        }

        const scoreDisp = document.getElementById("score-display");
        if (scoreDisp) scoreDisp.innerText = `Puntos: ${score}`;

        if (typeof ModoInfinito !== 'undefined' && ModoInfinito.activo) {
            ModoInfinito.registrarAcierto();
            const streakDisp = document.getElementById("streak-display");
            if (streakDisp) streakDisp.innerText = ModoInfinito.rachaActual;
            loadQuestion();
        } else {
            currentIndex++;
            if (currentIndex < bancoMezclado.length) {
                loadQuestion();
            } else {
                const quizArea = document.getElementById("quiz");
                if (quizArea) {
                    quizArea.innerHTML = `
                        <h2 style="color: #00feff; text-shadow: 0 0 10px #00feff;">¡GG! RONDA SUPERADA</h2>
                        <p style="font-size: 1.5rem; margin: 20px 0;">Puntaje final: ${score}</p>
                        <button class="btn-option" onclick="volverAlMenu()">INSERT COIN (VOLVER)</button>
                    `;
                }
            }
        }
    } else {
        if (escudoActivo) {
            escudoActivo = false;
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            alert("🛡️ ¡El Escudo te protegió del Game Over!");
            if (typeof ModoInfinito === 'undefined' || !ModoInfinito.activo) currentIndex++;
            loadQuestion();
            return;
        }

        if (typeof Sonidos !== 'undefined') Sonidos.playError();

        const quizArea = document.getElementById("quiz");
        const gameOverScreen = document.getElementById("game-over-screen");
        if (quizArea) quizArea.style.display = "none";
        if (gameOverScreen) gameOverScreen.style.display = "block";

        const scoreOver = document.getElementById("score-over");
        if (scoreOver) scoreOver.innerText = score;

        const infiniteStats = document.getElementById("infinite-game-over-stats");
        if (typeof ModoInfinito !== 'undefined' && ModoInfinito.activo) {
            if (infiniteStats) infiniteStats.style.display = "block";
            const finalStreak = document.getElementById("final-streak-over");
            const bestStreak = document.getElementById("best-streak-over");
            if (finalStreak) finalStreak.innerText = ModoInfinito.rachaActual;
            if (bestStreak) bestStreak.innerText = ModoInfinito.mejorRacha;
        } else {
            if (infiniteStats) infiniteStats.style.display = "none";
        }
    }
}

// --- TIENDA Y COMODINES ---
function abrirTienda() {
    const genreSel = document.getElementById("genre-selection");
    const diffSel = document.getElementById("difficulty-selection");
    const shopScr = document.getElementById("shop-screen");

    if (genreSel) genreSel.style.display = "none";
    if (diffSel) diffSel.style.display = "none";
    if (shopScr) shopScr.style.display = "block";
    actualizarPantallaTienda();
}

function cerrarTienda() {
    const genreSel = document.getElementById("genre-selection");
    const shopScr = document.getElementById("shop-screen");

    if (shopScr) shopScr.style.display = "none";
    if (genreSel) genreSel.style.display = "block";
    actualizarPantallaTienda();
}

function actualizarPantallaTienda() {
    if (typeof Tienda === 'undefined') return;
    const pts = Tienda.puntosDisponibles || 0;
    
    const menuPts = document.getElementById("tienda-puntos-menu");
    const shopPts = document.getElementById("shop-points-display");
    if (menuPts) menuPts.innerText = pts;
    if (shopPts) shopPts.innerText = pts;

    const cantMitad = document.getElementById("shop-cant-mitad");
    const cantEscudo = document.getElementById("shop-cant-escudo");
    const cantSaltar = document.getElementById("shop-cant-saltar");
    const cantDoble = document.getElementById("shop-cant-doble");

    if (cantMitad) cantMitad.innerText = Tienda.inventario.mitad || 0;
    if (cantEscudo) cantEscudo.innerText = Tienda.inventario.escudo || 0;
    if (cantSaltar) cantSaltar.innerText = Tienda.inventario.saltar || 0;
    if (cantDoble) cantDoble.innerText = Tienda.inventario.doble || 0;
}

function comprarComodin(item) {
    if (typeof Tienda === 'undefined') return;
    const comprado = Tienda.comprarItem(item);
    if (comprado) {
        actualizarPantallaTienda();
    } else {
        if (typeof Sonidos !== 'undefined') Sonidos.playError();
        alert("Puntos insuficientes para comprar este comodín.");
    }
}

function actualizarHUDTienda() {
    if (typeof Tienda === 'undefined') return;
    const cantMitad = document.getElementById("cant-mitad");
    const cantEscudo = document.getElementById("cant-escudo");
    const cantSaltar = document.getElementById("cant-saltar");
    const cantDoble = document.getElementById("cant-doble");

    if (cantMitad) cantMitad.innerText = Tienda.inventario.mitad || 0;
    if (cantEscudo) cantEscudo.innerText = Tienda.inventario.escudo || 0;
    if (cantSaltar) cantSaltar.innerText = Tienda.inventario.saltar || 0;
    if (cantDoble) cantDoble.innerText = Tienda.inventario.doble || 0;
}

function usarComodin(tipo) {
    if (typeof Tienda === 'undefined') return;

    if (tipo === 'mitad') {
        if (Tienda.usarItem('mitad')) {
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            const currentQ = (typeof ModoInfinito !== 'undefined' && ModoInfinito.activo) ? bancoMezclado[0] : bancoMezclado[currentIndex];
            const correctIndex = currentQ ? currentQ.correct : 0;
            const botones = Array.from(document.querySelectorAll("#options-container .btn-option"));
            let eliminados = 0;

            botones.forEach(btn => {
                const idx = parseInt(btn.dataset.index, 10);
                if (idx !== correctIndex && eliminados < 2) {
                    btn.style.visibility = "hidden";
                    eliminados++;
                }
            });
        } else {
            if (typeof Sonidos !== 'undefined') Sonidos.playError();
            alert("No tienes comodines 50/50 disponibles.");
        }
    } else if (tipo === 'escudo') {
        if (escudoActivo) {
            alert("Ya tienes un escudo activo para esta pregunta.");
            return;
        }
        if (Tienda.usarItem('escudo')) {
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            escudoActivo = true;
            alert("🛡️ Escudo activado para la siguiente pregunta.");
        } else {
            if (typeof Sonidos !== 'undefined') Sonidos.playError();
            alert("No tienes escudos disponibles.");
        }
    } else if (tipo === 'saltar') {
        if (Tienda.usarItem('saltar')) {
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            if (typeof ModoInfinito === 'undefined' || !ModoInfinito.activo) currentIndex++;
            loadQuestion();
        } else {
            if (typeof Sonidos !== 'undefined') Sonidos.playError();
            alert("No tienes saltos disponibles.");
        }
    } else if (tipo === 'doble') {
        if (multiplicadorPuntos > 1) {
            alert("El multiplicador x2 ya está activo.");
            return;
        }
        if (Tienda.usarItem('doble')) {
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            multiplicadorPuntos = 2;
            alert("✨ Multiplicador x2 activado para la respuesta.");
        } else {
            if (typeof Sonidos !== 'undefined') Sonidos.playError();
            alert("No tienes multiplicadores disponibles.");
        }
    }

    actualizarHUDTienda();
    actualizarPantallaTienda();
}

function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    selectedGenre = "";
    selectedLevel = "";
    multiplicadorPuntos = 1;
    escudoActivo = false;

    if (typeof ModoInfinito !== 'undefined') {
        ModoInfinito.desactivar();
    }

    const quizArea = document.getElementById("quiz");
    if (quizArea) {
        quizArea.innerHTML = `
            <h2 id="question">Cargando pregunta...</h2>
            <div id="options-container"></div>
        `;
    }

    const gameEl = document.getElementById("game");
    const gameOverScreen = document.getElementById("game-over-screen");
    const shopScreen = document.getElementById("shop-screen");
    const difficultySelection = document.getElementById("difficulty-selection");
    const genreSelection = document.getElementById("genre-selection");
    const menuEl = document.getElementById("menu");

    if (gameEl) gameEl.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    if (shopScreen) shopScreen.style.display = "none";
    if (difficultySelection) difficultySelection.style.display = "none";
    if (genreSelection) genreSelection.style.display = "block";
    if (menuEl) menuEl.style.display = "block";

    actualizarPantallaTienda();
}

// --- CERRAR SESIÓN ---
function cerrarSesion() {
    localStorage.removeItem("press_start_usuario_actual");
    window.location.href = "login.html";
}