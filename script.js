let selectedGenre = "";
let selectedLevel = "";
let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = "";

// Modificadores activos por pregunta
let multiplicadorPuntos = 1;
let escudoActivo = false;

const menuEl = document.getElementById("menu");
const genreSelection = document.getElementById("genre-selection");
const difficultySelection = document.getElementById("difficulty-selection");
const shopScreen = document.getElementById("shop-screen");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

// Inicializar el helper de Modo Infinito enviándole la función generadora
if (typeof ModoInfinito !== 'undefined') {
    ModoInfinito.init(fetchPreguntasServerless);
}

// Reproducir sonido de clic global en cualquier botón
document.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        if (typeof Sonidos !== 'undefined') {
            Sonidos.playClic();
        }
    }
});

// Verificación de sesión y actualización de la tienda al cargar la página
window.addEventListener("DOMContentLoaded", () => {
    const usuarioActual = localStorage.getItem("press_start_usuario_actual");

    // Si no ha iniciado sesión, lo redirige automáticamente a login.html
    if (!usuarioActual) {
        window.location.href = "login.html";
        return;
    }

    console.log("Sesión activa para el jugador:", usuarioActual);
    actualizarPantallaTienda();
});

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

    document.getElementById("score-display").innerText = "Puntos: 0";
    document.getElementById("difficulty-badge").innerText = nivelActualLabel;

    const isInfinite = (level === "Infinito");
    
    if (isInfinite) {
        ModoInfinito.iniciarModo(genre);
        document.getElementById("infinite-streak-badge").style.display = "inline";
        document.getElementById("streak-display").innerText = "0";
    } else {
        ModoInfinito.desactivar();
        document.getElementById("infinite-streak-badge").style.display = "none";
    }

    actualizarHUDTienda();

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
        bancoMezclado = await fetchPreguntasServerless(genre, level, isInfinite ? 5 : 10);
        
        if (isInfinite) {
            ModoInfinito.preguntasBuffer = [...bancoMezclado];
            ModoInfinito.evaluarPrecarga(genre);
        }

        loadQuestion();

    } catch (error) {
        console.error("Error al iniciar el Quiz:", error);
        if (typeof Sonidos !== 'undefined') Sonidos.playError();
        
        quizArea.innerHTML = `
            <h2 style="color: #ff003c;">ERROR:</h2>
            <p style="font-size: 0.9rem; color: #fff;">${error.message}</p>
            <button class="btn-option" onclick="volverAlMenu()">VOLVER AL MENÚ</button>
        `;
    }
}

function loadQuestion() {
    let q;

    if (ModoInfinito.activo) {
        q = ModoInfinito.obtenerSiguientePregunta();
        ModoInfinito.evaluarPrecarga(selectedGenre);
        
        if (!q && bancoMezclado.length > currentIndex) {
            q = bancoMezclado[currentIndex];
        }
    } else {
        if (!bancoMezclado || currentIndex >= bancoMezclado.length) return;
        q = bancoMezclado[currentIndex];
    }

    if (!q) {
        quizArea.innerHTML = `<h2 style="color: #ffe600;">Cargando más preguntas... ⚡</h2>`;
        setTimeout(() => loadQuestion(), 1000);
        return;
    }

    multiplicadorPuntos = 1;

    document.getElementById("question").innerText = q.q;
    const container = document.getElementById("options-container");
    container.innerHTML = "";

    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.className = "btn-option";
        btn.dataset.index = i;
        btn.onclick = () => checkAnswer(i, q);
        container.appendChild(btn);
    });

    actualizarHUDTienda();
}

function checkAnswer(index, qObj) {
    const q = qObj || bancoMezclado[currentIndex];

    if (index === q.correct) {
        // Reproducir sonido de acierto
        if (typeof Sonidos !== 'undefined') {
            Sonidos.playAcierto();
        }

        const puntosGanados = 10 * multiplicadorPuntos;
        score += puntosGanados;

        if (typeof Tienda !== 'undefined') {
            Tienda.sumarPuntos(puntosGanados);
        }

        document.getElementById("score-display").innerText = `Puntos: ${score}`;

        if (ModoInfinito.activo) {
            ModoInfinito.registrarAcierto();
            document.getElementById("streak-display").innerText = ModoInfinito.rachaActual;
            loadQuestion();
        } else {
            currentIndex++;
            if (currentIndex < bancoMezclado.length) {
                loadQuestion();
            } else {
                quizArea.innerHTML = `
                    <h2 style="color: #00feff; text-shadow: 0 0 10px #00feff;">¡GG! RONDA SUPERADA</h2>
                    <p style="font-size: 1.5rem; margin: 20px 0;">Puntaje final: ${score}</p>
                    <button class="btn-option" onclick="volverAlMenu()">INSERT COIN (VOLVER)</button>
                `;
            }
        }
    } else {
        // Verificar si el escudo nos protege
        if (escudoActivo) {
            escudoActivo = false;
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            alert("🛡️ ¡El Escudo te protegió del Game Over!");
            if (!ModoInfinito.activo) currentIndex++;
            loadQuestion();
            return;
        }

        // Reproducir sonido de error / Game Over
        if (typeof Sonidos !== 'undefined') {
            Sonidos.playError();
        }

        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;

        const infiniteStats = document.getElementById("infinite-game-over-stats");
        if (ModoInfinito.activo) {
            infiniteStats.style.display = "block";
            document.getElementById("final-streak-over").innerText = ModoInfinito.rachaActual;
            document.getElementById("best-streak-over").innerText = ModoInfinito.mejorRacha;
        } else {
            infiniteStats.style.display = "none";
        }
    }
}

// --- TIENDA Y COMODINES ---
function abrirTienda() {
    genreSelection.style.display = "none";
    difficultySelection.style.display = "none";
    shopScreen.style.display = "block";
    actualizarPantallaTienda();
}

function cerrarTienda() {
    shopScreen.style.display = "none";
    genreSelection.style.display = "block";
    actualizarPantallaTienda();
}

function actualizarPantallaTienda() {
    if (typeof Tienda === 'undefined') return;
    const pts = Tienda.puntosDisponibles || 0;
    
    document.getElementById("tienda-puntos-menu").innerText = pts;
    const shopPts = document.getElementById("shop-points-display");
    if (shopPts) shopPts.innerText = pts;

    if (document.getElementById("shop-cant-mitad")) {
        document.getElementById("shop-cant-mitad").innerText = Tienda.inventario.mitad || 0;
        document.getElementById("shop-cant-escudo").innerText = Tienda.inventario.escudo || 0;
        document.getElementById("shop-cant-saltar").innerText = Tienda.inventario.saltar || 0;
        document.getElementById("shop-cant-doble").innerText = Tienda.inventario.doble || 0;
    }
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
    document.getElementById("cant-mitad").innerText = Tienda.inventario.mitad || 0;
    document.getElementById("cant-escudo").innerText = Tienda.inventario.escudo || 0;
    document.getElementById("cant-saltar").innerText = Tienda.inventario.saltar || 0;
    document.getElementById("cant-doble").innerText = Tienda.inventario.doble || 0;
}

function usarComodin(tipo) {
    if (typeof Tienda === 'undefined') return;

    if (tipo === 'mitad') {
        if (Tienda.usarItem('mitad')) {
            if (typeof Sonidos !== 'undefined') Sonidos.playPowerUp();
            const currentQ = ModoInfinito.activo ? bancoMezclado[0] : bancoMezclado[currentIndex];
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
            if (!ModoInfinito.activo) currentIndex++;
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

    quizArea.innerHTML = `
        <h2 id="question">Cargando pregunta...</h2>
        <div id="options-container"></div>
    `;

    gameEl.style.display = "none";
    gameOverScreen.style.display = "none";
    shopScreen.style.display = "none";
    difficultySelection.style.display = "none";
    genreSelection.style.display = "block";
    menuEl.style.display = "block";

    actualizarPantallaTienda();
}

// --- CERRAR SESIÓN ---
function cerrarSesion() {
    localStorage.removeItem("press_start_usuario_actual");
    window.location.href = "login.html";
}