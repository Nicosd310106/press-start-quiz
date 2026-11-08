let selectedGenre = "";
let selectedLevel = "";
let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = "";

// Puntos acumulados en la partida actual pendientes de guardar
let puntosPartidaPendientes = 0;

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
                if (typeof Sonidos !== "undefined" && typeof Sonidos.playClic === "function") Sonidos.playClic();
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
                if (typeof Sonidos !== "undefined" && typeof Sonidos.playClic === "function") Sonidos.playClic();
                const genreSel = document.getElementById("genre-selection");
                const diffSel = document.getElementById("difficulty-selection");
                if (diffSel) diffSel.style.display = "none";
                if (genreSel) genreSel.style.display = "block";
            });
        }

        // Selección de dificultad
        document.querySelectorAll(".btn-difficulty").forEach(btn => {
            btn.addEventListener("click", () => {
                if (typeof Sonidos !== "undefined" && typeof Sonidos.playClic === "function") Sonidos.playClic();
                selectedLevel = btn.getAttribute("data-level") || btn.innerText;
                nivelActualLabel = `${selectedGenre} - ${selectedLevel}`;
                iniciarQuiz(selectedGenre, selectedLevel);
            });
        });

        if (typeof Tienda !== "undefined" && typeof Tienda.actualizarUI === "function") {
            Tienda.actualizarUI();
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
        const res = await fetch('/api/ranking.js');
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
    let ptsNum = parseInt(puntos, 10);
    if (isNaN(ptsNum) || ptsNum < 0) {
        ptsNum = 0;
    }

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
        const res = await fetch('/api/ranking.js');
        const data = await res.json();

        if (res.ok && data.ranking && data.ranking.length > 0) {
            listaEl.innerHTML = "";
            data.ranking.forEach((jugador) => {
                const li = document.createElement("li");
                li.style.margin = "4px 0";
                li.innerHTML = `<strong>${jugador.nickname}</strong>: <span style="color:#00feff;">${Math.max(0, parseInt(jugador.puntos_totales, 10) || 0)} pts</span>`;
                listaEl.appendChild(li);
            });
        }
    } catch (error) {
        console.warn("No se pudo obtener el ranking.");
    }
}

async function guardarProgresoManual() {
    if (typeof Sonidos !== "undefined" && typeof Sonidos.playClic === "function") Sonidos.playClic();

    if (puntosPartidaPendientes <= 0) {
        return;
    }

    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem('press_start_usuario_actual');
    
    const genreLower = (selectedGenre || "").toLowerCase();
    let catId = 1;
    if (genreLower.includes("survival") || genreLower.includes("horror")) catId = 1;
    else if (genreLower.includes("rpg")) catId = 2;
    else if (genreLower.includes("acción") || genreLower.includes("accion") || genreLower.includes("aventura")) catId = 3;
    else if (genreLower.includes("shooter") || genreLower.includes("disparos")) catId = 4;
    else if (genreLower.includes("lucha") || genreLower.includes("peleas")) catId = 5;
    else if (genreLower.includes("plataforma")) catId = 6;
    else if (genreLower.includes("estrategia")) catId = 7;
    else if (genreLower.includes("simulación") || genreLower.includes("simulacion")) catId = 8;
    else if (genreLower.includes("carreras")) catId = 9;
    else if (genreLower.includes("deporte")) catId = 10;

    try {
        const res = await fetch('/api/partida.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId ? parseInt(userId, 10) : null,
                nickname: usuarioActual,
                categoriaId: catId,
                dificultad: selectedLevel || "Fácil",
                puntosObtenidos: puntosPartidaPendientes
            })
        });

        if (res.ok) {
            const data = await res.json();
            puntosPartidaPendientes = 0;

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

    if (genreLower.includes("survival") || genreLower.includes("horror")) categoriaId = 1;
    else if (genreLower.includes("rpg")) categoriaId = 2;
    else if (genreLower.includes("acción") || genreLower.includes("accion") || genreLower.includes("aventura")) categoriaId = 3;
    else if (genreLower.includes("shooter") || genreLower.includes("disparos")) categoriaId = 4;
    else if (genreLower.includes("lucha") || genreLower.includes("peleas")) categoriaId = 5;
    else if (genreLower.includes("plataforma") || genreLower.includes("plataformas")) categoriaId = 6;
    else if (genreLower.includes("estrategia")) categoriaId = 7;
    else if (genreLower.includes("simulación") || genreLower.includes("simulacion")) categoriaId = 8;
    else if (genreLower.includes("carreras")) categoriaId = 9;
    else if (genreLower.includes("deporte") || genreLower.includes("deportes")) categoriaId = 10;

    let dificultadNormalizada = (level || "Fácil").toLowerCase().replace("á", "a").replace("í", "i");
    
    let queryUrl = `/api/preguntas.js?categoria_id=${categoriaId}`;
    if (!dificultadNormalizada.includes("infinito") && !dificultadNormalizada.includes("todas")) {
        queryUrl += `&dificultad=${dificultadNormalizada}`;
    }

    try {
        const response = await fetch(queryUrl);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.preguntas) && data.preguntas.length > 0) {
                return data.preguntas;
            }
        }
    } catch (e) {
        console.warn("API /api/preguntas.js no disponible...");
    }

    try {
        const responseAlt = await fetch("/api/generar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ genre, level: "Fácil", count: 10 })
        });
        if (responseAlt.ok) {
            const dataAlt = await responseAlt.json();
            if (Array.isArray(dataAlt) && dataAlt.length > 0) {
                return dataAlt;
            }
        }
    } catch (e) {
        console.warn("Fallback /api/generar.js no respondió.");
    }

    const bancosRespaldoLocal = {
        "Acción y Aventura": [
            { q: "¿Cómo se llama el explorador cazatesoros de la saga Uncharted?", options: ["Nathan Drake", "Lara Croft", "Arthur Morgan", "Kratos"], correct: 0 },
            { q: "¿En qué videojuego encarnas a Kratos luchando contra dioses griegos y nórdicos?", options: ["God of War", "Devil May Cry", "Darksiders", "Bayonetta"], correct: 0 },
            { q: "¿Cómo se llama la protagonista de la saga Tomb Raider?", options: ["Lara Croft", "Jill Valentine", "Ellie", "Aloy"], correct: 0 },
            { q: "¿En qué franquicia viajas entre diferentes épocas históricas usando el Animus?", options: ["Assassin's Creed", "Prince of Persia", "Watch Dogs", "Dishonored"], correct: 0 }
        ],
        "Survival Horror": [
            { q: "¿Qué estudio desarrolló originalmente la saga Silent Hill?", options: ["Capcom", "Team Silent (Konami)", "Shinra", "Square Enix"], correct: 1 },
            { q: "¿En qué año se lanzó el primer Resident Evil?", options: ["1996", "1998", "2000", "1994"], correct: 0 },
            { q: "¿Cómo se llama la protagonista de Silent Hill 3?", options: ["Heather Mason", "Jill Valentine", "Claire Redfield", "Ada Wong"], correct: 0 }
        ],
        "Deportes": [
            { q: "¿En qué año se lanzó el primer FIFA de EA Sports?", options: ["1993", "1998", "2000", "1990"], correct: 0 },
            { q: "¿Qué saga de fútbol arcade perteneció a Konami?", options: ["PES / Winning Eleven", "FIFA", "Virtua Striker", "Red Card"], correct: 0 },
            { q: "¿En qué saga compites en la liga profesional de básquetbol?", options: ["NBA 2K", "NBA Jam", "Basketball Life", "Courtside"], correct: 0 }
        ],
        "Simulación": [
            { q: "¿Qué simulador de vida fue diseñado originalmente por Will Wright?", options: ["The Sims", "Animal Crossing", "Second Life", "Minecraft"], correct: 0 },
            { q: "¿En qué simulador de aviación puedes volar aviones comerciales con clima en tiempo real?", options: ["Microsoft Flight Simulator", "X-Plane", "FlightGear", "DCS World"], correct: 0 },
            { q: "¿Qué juego te permite gestionar una granja moderna con maquinaria real?", options: ["Farming Simulator", "Stardew Valley", "Hay Day", "FarmVille"], correct: 0 }
        ],
        "Carreras": [
            { q: "¿Qué saga exclusiva de PlayStation se apoda 'The Real Driving Simulator'?", options: ["Gran Turismo", "Need for Speed", "Forza Motorsport", "Burnout"], correct: 0 },
            { q: "¿Qué franquicia de carreras incluye ítems como caparazones y plátanos?", options: ["Mario Kart", "Sonic Racing", "Crash Team Racing", "Wacky Races"], correct: 0 },
            { q: "¿Qué juego de carreras destaca por sus persecuciones policiales y tuning?", options: ["Need for Speed: Most Wanted", "Gran Turismo 4", "Driveclub", "Grid"], correct: 0 }
        ],
        "Lucha": [
            { q: "¿Qué franquicia creó el famoso movimiento especial 'Hadoken'?", options: ["Street Fighter", "Mortal Kombat", "Tekken", "King of Fighters"], correct: 0 },
            { q: "¿En qué videojuego de peleas se ejecutan los movimientos finales llamados 'Fatalities'?", options: ["Mortal Kombat", "Tekken", "Injustice", "Dead or Alive"], correct: 0 }
        ],
        "RPG": [
            { q: "¿Cómo se llama el mundo fantástico donde transcurre la saga The Witcher?", options: ["El Continente", "Tamriel", "Hyrule", "Azeroth"], correct: 0 },
            { q: "¿Qué estudio de videojuegos desarrolló Skyrim y Fallout 4?", options: ["Bethesda Game Studios", "Bioware", "Square Enix", "CD Projekt Red"], correct: 0 }
        ],
        "Shooter": [
            { q: "¿Qué mapa emblemático pertenece a la saga Counter-Strike?", options: ["de_dust2", "Nuketown", "Wake Island", "Blood Gulch"], correct: 0 },
            { q: "¿Cómo se llama el héroe celestialmente apodado 'Master Chief'?", options: ["John-117", "Marcus Fenix", "Doom Slayer", "Gordon Freeman"], correct: 0 }
        ],
        "Plataformas": [
            { q: "¿En qué año se lanzó el icónico juego Super Mario Bros para NES?", options: ["1985", "1983", "1990", "1988"], correct: 0 },
            { q: "¿Qué marsupial naranja es la mascota clásica de las plataformas de PlayStation?", options: ["Crash Bandicoot", "Spyro", "Rayman", "Jak"], correct: 0 }
        ],
        "Estrategia": [
            { q: "¿Qué juego de estrategia en tiempo real popularizó la frase 'Wololo' de los sacerdotes?", options: ["Age of Empires", "StarCraft", "Warcraft III", "Command & Conquer"], correct: 0 },
            { q: "¿Qué saga se enfoca en turnos y la conquista mundial desde la antigüedad?", options: ["Civilization", "Total War", "StarCraft", "Company of Heroes"], correct: 0 }
        ]
    };

    for (const key in bancosRespaldoLocal) {
        if (genreLower.includes(key.toLowerCase()) || key.toLowerCase().includes(genreLower)) {
            return bancosRespaldoLocal[key];
        }
    }

    return bancosRespaldoLocal["Acción y Aventura"];
}

async function iniciarQuiz(genre, level) {
    score = 0;
    currentIndex = 0;
    puntosPartidaPendientes = 0;
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
        <h2 id="question">Cargando preguntas...</h2>
        <div id="options-container" class="options-grid">
            <p style="text-align: center; color: #00feff; font-size: 1.1rem;">⚡ Conectando con la base de datos... 🎮</p>
        </div>
    `;

    try {
        bancoMezclado = await fetchPreguntasBD(genre, level);
        loadQuestion();
    } catch (error) {
        console.error("Error al iniciar el Quiz:", error);
        if (quizArea) {
            quizArea.innerHTML = `
                <h2 style="color: #ff003c;">ERROR DE CONEXIÓN</h2>
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
    const container = document.getElementById("options-container") || document.getElementById("quiz");

    const enunciado = q.enunciado || q.q;
    const opciones = q.opciones || q.options;

    if (qEl) qEl.innerText = enunciado;

    const optionsGrid = document.getElementById("options-container");
    if (optionsGrid) {
        optionsGrid.innerHTML = "";
        opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            const textoOpt = typeof opt === 'object' ? opt.texto_opcion : opt;
            btn.innerText = textoOpt;
            btn.className = "btn-option";
            btn.style.display = "block";
            btn.dataset.index = i;
            btn.onclick = () => checkAnswer(i, q);
            optionsGrid.appendChild(btn);
        });
    } else if (container) {
        const botonesExistentes = container.querySelectorAll(".btn-option");
        botonesExistentes.forEach((btn, i) => {
            if (opciones[i]) {
                const textoOpt = typeof opciones[i] === 'object' ? opciones[i].texto_opcion : opciones[i];
                btn.innerText = textoOpt;
                btn.style.display = "block";
                btn.onclick = () => checkAnswer(i, q);
            }
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
        if (typeof Sonidos !== "undefined" && typeof Sonidos.playAcierto === "function") Sonidos.playAcierto();

        let puntosBase = 20;
        const diffLower = (selectedLevel || "").toLowerCase();

        if (diffLower.includes("media") || diffLower.includes("medio")) {
            puntosBase = 40;
        } else if (diffLower.includes("difícil") || diffLower.includes("dificil")) {
            puntosBase = 80;
        }

        const puntosGanados = (puntosBase * multiplicadorPuntos);
        score += puntosGanados;
        puntosPartidaPendientes += puntosGanados;
        multiplicadorPuntos = 1;

        const scoreDisp = document.getElementById("score-display");
        if (scoreDisp) scoreDisp.innerText = `Puntos: ${score}`;

        currentIndex++;

        if (currentIndex >= bancoMezclado.length && (selectedLevel || "").toLowerCase().includes("infinito")) {
            const loaderEl = document.getElementById("infinite-loader");
            if (loaderEl) loaderEl.style.display = "block";

            fetchPreguntasBD(selectedGenre, selectedLevel)
                .then(nuevasPreguntas => {
                    bancoMezclado = bancoMezclado.concat(nuevasPreguntas);
                    if (loaderEl) loaderEl.style.display = "none";
                    loadQuestion();
                })
                .catch(() => {
                    if (loaderEl) loaderEl.style.display = "none";
                    mostrarPantallaFinal();
                });
        } else if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            mostrarPantallaFinal();
        }
    } else {
        if (escudoActivo) {
            escudoActivo = false;
            if (typeof Sonidos !== "undefined" && typeof Sonidos.playPowerUp === "function") Sonidos.playPowerUp();
            return;
        }

        if (typeof Sonidos !== "undefined" && typeof Sonidos.playError === "function") Sonidos.playError();

        const quizArea = document.getElementById("quiz");
        const gameOverScreen = document.getElementById("game-over-screen");
        if (quizArea) quizArea.style.display = "none";
        if (gameOverScreen) gameOverScreen.style.display = "block";
        const scoreOver = document.getElementById("score-over");
        if (scoreOver) scoreOver.innerText = score;
    }
}

function mostrarPantallaFinal() {
    // Guardado automático al superar la ronda
    guardarProgresoManual();

    const quizArea = document.getElementById("quiz");
    if (quizArea) {
        quizArea.innerHTML = `
            <h2 style="color: #00feff;">¡GG! RONDA SUPERADA</h2>
            <p style="font-size: 1.5rem;">Puntaje final: ${score}</p>
            <button class="btn-option" onclick="volverAlMenu()">VOLVER AL MENÚ</button>
        `;
    }
}

function usarComodin(tipo) {
    if (typeof Tienda === "undefined") return;

    if (!Tienda.inventario[tipo] || Tienda.inventario[tipo] <= 0) {
        return;
    }

    const q = bancoMezclado[currentIndex];
    if (!q) return;

    if (typeof Sonidos !== "undefined" && typeof Sonidos.playPowerUp === "function") Sonidos.playPowerUp();

    if (tipo === 'mitad') {
        const container = document.getElementById("options-container") || document.getElementById("quiz");
        if (!container) return;

        const botones = Array.from(container.querySelectorAll(".btn-option"));
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
                btn.style.display = "none";
                eliminadas++;
            }
        });

        Tienda.usarItem('mitad');

    } else if (tipo === 'escudo') {
        escudoActivo = true;
        Tienda.usarItem('escudo');

    } else if (tipo === 'saltar') {
        Tienda.usarItem('saltar');
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            mostrarPantallaFinal();
        }

    } else if (tipo === 'doble') {
        multiplicadorPuntos = 2;
        Tienda.usarItem('doble');
    }
}

async function volverAlMenu() {
    if (typeof Sonidos !== "undefined" && typeof Sonidos.playClic === "function") Sonidos.playClic();

    // Guardado de respaldo antes de reiniciar los contadores
    if (puntosPartidaPendientes > 0) {
        await guardarProgresoManual();
    }

    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    puntosPartidaPendientes = 0;

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