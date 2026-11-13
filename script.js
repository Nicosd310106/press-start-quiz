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
let preguntaRespondida = false;

document.addEventListener("DOMContentLoaded", () => {
    try {
        const usuarioActual = localStorage.getItem("press_start_usuario_actual");

        if (!usuarioActual) {
            window.location.href = "login.html";
            return;
        }

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
        const res = await fetch('/api/usuarios/ranking.js');
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
    if (isNaN(ptsNum) || ptsNum < 0) ptsNum = 0;

    if (typeof Tienda !== "undefined") {
        Tienda.puntosDisponibles = ptsNum;
        Tienda.guardarDatos();
    }

    const tiendaPtsSpan = document.getElementById("tienda-puntos-menu");
    if (tiendaPtsSpan) tiendaPtsSpan.innerText = ptsNum;

    const shopPointsDisp = document.getElementById("shop-points-display");
    if (shopPointsDisp) shopPointsDisp.innerText = ptsNum;
}

async function cargarRanking() {
    const listaEl = document.getElementById("ranking-lista");
    if (!listaEl) return;

    try {
        const res = await fetch('/api/usuarios/ranking.js');
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
    if (puntosPartidaPendientes <= 0) return;

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

    const saldoActual = (typeof Tienda !== "undefined") ? Tienda.puntosDisponibles : 0;
    const nuevoTotalReal = saldoActual + puntosPartidaPendientes;

    try {
        const res = await fetch('/api/partida.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId ? parseInt(userId, 10) : null,
                nickname: usuarioActual,
                categoriaId: catId,
                dificultad: selectedLevel || "Fácil",
                puntosObtenidos: puntosPartidaPendientes,
                puntosTotalesDirectos: nuevoTotalReal
            })
        });

        if (res.ok) {
            const data = await res.json();
            puntosPartidaPendientes = 0;
            refrescarUIConPuntos(data.puntosTotales !== undefined ? data.puntosTotales : nuevoTotalReal);
        }
    } catch (error) {
        console.error("Error al registrar puntos en MySQL:", error);
    }
}

// Banco manual ampliado con explicaciones cortas para la presentación
function obtenerBancoManualPorGenero(genre) {
    const genreLower = (genre || "").toLowerCase();

    const bancosRespaldoLocal = {
        "Survival Horror": [
            { q: "¿Qué estudio desarrolló originalmente la saga Silent Hill?", options: ["Capcom", "Team Silent (Konami)", "Square Enix", "Naughty Dog"], correct: 1, exp: "Team Silent, un grupo interno de Konami, creó el primer Silent Hill en 1999 para PlayStation." },
            { q: "¿En qué año se lanzó el primer Resident Evil?", options: ["1996", "1998", "2000", "1994"], correct: 0, exp: "Capcom lanzó el primer Resident Evil en 1996, popularizando el género 'Survival Horror'." },
            { q: "¿Cómo se llama la ciudad infestada en Resident Evil 2 y 3?", options: ["Raccoon City", "Silent Hill", "Bright Falls", "Rapture"], correct: 0, exp: "Raccoon City es la ciudad ficticia donde la corporación Umbrella desató el Virus-T." },
            { q: "¿Qué objeto clásico se usa para guardar partida en los primeros Resident Evil?", options: ["Cintas de tinta", "Disquetes", "Cristales rojos", "Monedas"], correct: 0, exp: "Las cintas de tinta se usaban en las máquinas de escribir repartidas por las salas seguras." },
            { q: "¿Cómo se llama el protagonista de Alan Wake?", options: ["Alan Wake", "Leon Kennedy", "Isaac Clarke", "Sebastian Castellanos"], correct: 0, exp: "Alan Wake es un escritor de novelas de suspenso atrapado en un pueblo donde su historia cobra vida." },
            { q: "¿En qué nave espacial transcurre el primer Dead Space?", options: ["USG Ishimura", "Nostromo", "Normandy", "Pillar of Autumn"], correct: 0, exp: "La USG Ishimura es una enorme nave minera invadida por criaturas llamadas Necromorfos." }
        ],
        "RPG": [
            { q: "¿Cómo se llama el mundo fantástico donde transcurre The Witcher?", options: ["El Continente", "Tamriel", "Hyrule", "Azeroth"], correct: 0, exp: "Geralt de Rivia recorre 'El Continente', un mundo inspirado en la mitología eslava." },
            { q: "¿Qué estudio desarrolló Skyrim y Fallout 4?", options: ["Bethesda Game Studios", "BioWare", "Square Enix", "CD Projekt Red"], correct: 0, exp: "Bethesda es famosa por crear mundos abiertos masivos de rol como The Elder Scrolls y Fallout." },
            { q: "¿Cuál es el arma icónica de Cloud Strife en Final Fantasy VII?", options: ["Espada Mortal (Buster Sword)", "Llave Espada", "Espada Maestra", "Sable Láser"], correct: 0, exp: "La Buster Sword es una espada gigante heredada de su amigo Zack Fair." },
            { q: "¿En qué región comienzan los juegos clásicos de Pokémon Rojo y Azul?", options: ["Kanto", "Johto", "Hoenn", "Sinnoh"], correct: 0, exp: "Kanto está basada en la región real homónima de Japón e incluye los primeros 151 Pokémon." },
            { q: "¿Qué juego de rol ganó el GOTY 2023 basado en Dungeons & Dragons?", options: ["Baldur's Gate 3", "Starfield", "Diablo IV", "Final Fantasy XVI"], correct: 0, exp: "Desarrollado por Larian Studios, destacó por su libertad de decisiones y combates por turnos." },
            { q: "¿Cómo se llama el protagonista silencioso de Persona 5?", options: ["Joker", "Yu Narukami", "Makoto Yuki", "Cloud"], correct: 0, exp: "Joker lidera a los 'Ladrones Fantasma de Corazones' en Tokio." }
        ],
        "Acción y Aventura": [
            { q: "¿Cómo se llama el explorador cazatesoros de la saga Uncharted?", options: ["Nathan Drake", "Lara Croft", "Arthur Morgan", "Indiana Jones"], correct: 0, exp: "Nathan Drake busca tesoros históricos perdidos alrededor del mundo junto a su mentor Sully." },
            { q: "¿En qué videojuego encarnas a Kratos luchando contra dioses?", options: ["God of War", "Devil May Cry", "Darksiders", "Bayonetta"], correct: 0, exp: "Kratos comenzó enfrentando a los dioses del Olimpo griego y luego viajó a la mitología nórdica." },
            { q: "¿Cómo se llama la arqueóloga protagonista de Tomb Raider?", options: ["Lara Croft", "Jill Valentine", "Ellie", "Aloy"], correct: 0, exp: "Lara Croft debutó en 1996 y es uno de los íconos más famosos de los videojuegos de aventura." },
            { q: "¿Qué dispositivo permite revivir recuerdos ancestrales en Assassin's Creed?", options: ["El Animus", "El Pip-Boy", "La Trifuerza", "El Omnitrix"], correct: 0, exp: "El Animus lee la memoria genética del usuario para proyectar la vida de sus antepasados." },
            { q: "¿Cómo se llama el protagonista principal de Red Dead Redemption 2?", options: ["Arthur Morgan", "John Marston", "Trevor Philips", "Tommy Vercetti"], correct: 0, exp: "Arthur Morgan es un forajido veterano de la banda de Van der Linde en el Lejano Oeste de 1899." },
            { q: "¿Qué compañía desarrolló The Last of Us?", options: ["Naughty Dog", "Rockstar Games", "Ubisoft", "Santa Monica Studio"], correct: 0, exp: "Naughty Dog creó tanto The Last of Us como las sagas Uncharted y Crash Bandicoot." }
        ],
        "Shooter": [
            { q: "¿Qué mapa es el más icónico de la saga Counter-Strike?", options: ["de_dust2", "Nuketown", "Blood Gulch", "rust"], correct: 0, exp: "Dust II es el mapa competitivo más jugado en la historia de Counter-Strike desde el año 2001." },
            { q: "¿Cómo se llama el protagonista con armadura verde de Halo?", options: ["Master Chief (John-117)", "Doom Slayer", "Marcus Fenix", "Gordon Freeman"], correct: 0, exp: "El Jefe Maestro es un supersoldado Spartan que defiende a la humanidad de la alianza alienígena Covenant." },
            { q: "¿En qué año se lanzó el primer DOOM revolucionando los FPS?", options: ["1993", "1999", "1989", "2001"], correct: 0, exp: "id Software lanzó DOOM en 1993 para MS-DOS, sentando las bases de los disparos en primera persona." },
            { q: "¿Cuál es el famoso mapa pequeño de Call of Duty: Black Ops?", options: ["Nuketown", "Mirage", "Shipment", "Terminal"], correct: 0, exp: "Nuketown simula un pueblo de pruebas nucleares de los años 50 con combates frenéticos." },
            { q: "¿Qué arma de física utiliza Gordon Freeman en Half-Life 2?", options: ["Pistola de Gravedad", "BFG 9000", "Lancer", "Portal Gun"], correct: 0, exp: "La Pistola de Gravedad permite atraer y lanzar objetos del escenario como proyectiles." },
            { q: "¿Qué juego táctico 5v5 combina disparos precisos con habilidades de agentes?", options: ["Valorant", "Overwatch", "Apex Legends", "Fortnite"], correct: 0, exp: "Desarrollado por Riot Games, mezcla la economía de Counter-Strike con poderes únicos por personaje." }
        ],
        "Lucha": [
            { q: "¿Qué franquicia creó el famoso ataque de energía 'Hadoken'?", options: ["Street Fighter", "Mortal Kombat", "Tekken", "King of Fighters"], correct: 0, exp: "Ryu y Ken ejecutan el Hadoken haciendo un cuarto de círculo adelante más golpe." },
            { q: "¿En qué saga se ejecutan los movimientos finales llamados 'Fatalities'?", options: ["Mortal Kombat", "Tekken", "Injustice", "SoulCalibur"], correct: 0, exp: "Los Fatalities son remates sangrientos icónicos de Mortal Kombat desde su debut en 1992." },
            { q: "¿Qué torneo organiza la familia Mishima en la saga Tekken?", options: ["Torneo del Puño de Hierro", "Mortal Kombat", "World Warrior", "King of Fighters"], correct: 0, exp: "Kazuya y Heihachi Mishima compiten por el control del imperio financiero Mishima Zaibatsu." },
            { q: "¿Qué juego reúne a personajes de Nintendo para sacarlos del escenario?", options: ["Super Smash Bros.", "MultiVersus", "Brawlhalla", "Street Fighter"], correct: 0, exp: "En Smash Bros. no hay barra de vida tradicional: cuanto más porcentaje tenés, más lejos volás." },
            { q: "¿Quién es el ninja amarillo icónico de Mortal Kombat que grita 'Get over here!'?", options: ["Scorpion", "Sub-Zero", "Reptile", "Smoke"], correct: 0, exp: "Scorpion usa su arpón con cadena para atraer a sus rivales y golpearlos." },
            { q: "¿Qué estudio japonés creó The King of Fighters y Fatal Fury?", options: ["SNK", "Capcom", "Bandai Namco", "Arc System Works"], correct: 0, exp: "SNK fue el gran competidor de Capcom en los salones arcade de los años 90 con su sistema Neo Geo." }
        ],
        "Plataformas": [
            { q: "¿En qué año se lanzó Super Mario Bros. para la consola NES?", options: ["1985", "1983", "1990", "1988"], correct: 0, exp: "Lanzado en 1985, definió las reglas del diseño de niveles en los juegos de plataformas 2D." },
            { q: "¿Qué marsupial naranja fue la mascota de PlayStation en los años 90?", options: ["Crash Bandicoot", "Spyro", "Rayman", "Banjo"], correct: 0, exp: "Creado por Naughty Dog en 1996, Crash rompía cajas de madera y recolectaba frutas Wumpa." },
            { q: "¿Qué erizo azul es el rival histórico de Mario y corre a velocidad supersónica?", options: ["Sonic the Hedgehog", "Knuckles", "Tails", "Mega Man"], correct: 0, exp: "SEGA creó a Sonic en 1991 para destacar la velocidad de procesamiento de su consola Sega Genesis." },
            { q: "¿Cómo se llama el hermano alto y de gorra verde de Mario?", options: ["Luigi", "Wario", "Waluigi", "Toad"], correct: 0, exp: "Luigi apareció por primera vez en 1983 y suele saltar más alto pero con menos tracción que Mario." },
            { q: "¿Qué juego indie de plataformas trata sobre escalar una montaña enfrentando la ansiedad?", options: ["Celeste", "Hollow Knight", "Cuphead", "Ori"], correct: 0, exp: "Celeste combina plataformas de altísima precisión con una historia emotiva sobre superación." },
            { q: "¿Qué insecto caballero protagoniza el metroidvania Hollow Knight?", options: ["El Caballero (The Knight)", "Hornet", "Quirrel", "Zote"], correct: 0, exp: "Explora el reino subterráneo en ruinas de Hallownest armado con un aguijón." }
        ],
        "Estrategia": [
            { q: "¿Qué juego de estrategia popularizó el sonido 'Wololo' de los sacerdotes?", options: ["Age of Empires", "StarCraft", "Warcraft III", "Civilization"], correct: 0, exp: "En Age of Empires (1997), los sacerdotes convertían unidades enemigas a tu bando con ese cántico." },
            { q: "¿Qué saga de turnos te permite guiar una civilización desde la Edad de Piedra al espacio?", options: ["Civilization", "Total War", "Age of Mythology", "SimCity"], correct: 0, exp: "Creada por Sid Meier, permite ganar por ciencia, cultura, diplomacia o conquista militar." },
            { q: "¿Cuáles son las tres razas principales en StarCraft?", options: ["Terran, Zerg y Protoss", "Humanos, Orcos y Elfos", "Aliados, Soviéticos y Yuri", "Horda y Alianza"], correct: 0, exp: "StarCraft es uno de los pilares históricos de los deportes electrónicos (eSports) en Corea del Sur." },
            { q: "¿Qué juego de estrategia consiste en defender un jardín usando plantas contra zombis?", options: ["Plants vs. Zombies", "Bloons TD", "Clash Royale", "Kingdom Rush"], correct: 0, exp: "Es un juego tipo 'Tower Defense' donde administrás luz solar para plantar defensas." },
            { q: "¿De qué juego de estrategia nació originalmente el género MOBA (como League of Legends)?", options: ["Warcraft III", "Age of Empires II", "Command & Conquer", "Risk"], correct: 0, exp: "El mapa personalizado 'Defense of the Ancients' (DotA) de Warcraft III dio origen al género MOBA." },
            { q: "¿En qué juego controlás al príncipe Arthas Menethil antes de convertirse en el Rey Exánime?", options: ["Warcraft III: Reign of Chaos", "World of Warcraft", "Diablo II", "StarCraft II"], correct: 0, exp: "La campaña humana de Warcraft III narra la caída de Arthas intentando salvar su reino." }
        ],
        "Simulación": [
            { q: "¿Qué simulador de vida fue diseñado originalmente por Will Wright?", options: ["The Sims", "Animal Crossing", "Second Life", "Habbo"], correct: 0, exp: "Lanzado en el año 2000, permite construir casas y controlar la vida cotidiana de personajes virtuales." },
            { q: "¿En qué simulador podés pilotar aviones comerciales con clima satelital real?", options: ["Microsoft Flight Simulator", "Ace Combat", "Star Wars Squadrons", "Kerbal Space Program"], correct: 0, exp: "Usa mapas satelitales reales de Bing Maps para recrear prácticamente todo el planeta Tierra." },
            { q: "¿Qué juego indie te permite restaurar la granja de tu abuelo en Pueblo Pelícano?", options: ["Stardew Valley", "Farming Simulator", "Hay Day", "Harvest Moon"], correct: 0, exp: "Fue desarrollado por una sola persona (Eric Barone) durante más de cuatro años." },
            { q: "¿Qué simulador te pone al volante de camiones transportando cargas por rutas europeas?", options: ["Euro Truck Simulator 2", "Need for Speed", "Forza Horizon", "Gran Turismo"], correct: 0, exp: "Es famoso por su conducción relajante, gestión de empresa de logística y fidelidad en los camiones." },
            { q: "¿En qué juego diseñás cohetes espaciales aplicando leyes reales de física orbital?", options: ["Kerbal Space Program", "No Man's Sky", "Starfield", "Mass Effect"], correct: 0, exp: "Tenés que calcular empuje, combustible y gravedad para llevar astronautas a la luna sin estrellarte." },
            { q: "¿Qué juego de Nintendo te permite vivir en una isla junto a vecinos animales?", options: ["Animal Crossing: New Horizons", "Pokémon", "Pikmin", "Zelda"], correct: 0, exp: "Transcurre en tiempo real sincronizado con el reloj de la consola." }
        ],
        "Carreras": [
            { q: "¿Qué saga de PlayStation se promociona como 'The Real Driving Simulator'?", options: ["Gran Turismo", "Need for Speed", "Burnout", "Mario Kart"], correct: 0, exp: "Gran Turismo destaca por el realismo físico de sus autos y circuitos reales." },
            { q: "¿Qué franquicia de carreras permite lanzar caparazones y plátanos a los rivales?", options: ["Mario Kart", "Gran Turismo", "F1", "Assetto Corsa"], correct: 0, exp: "Mario Kart es el rey de las carreras arcade familiares desde Super Nintendo en 1992." },
            { q: "¿Qué entrega de Need for Speed de 2005 es famosa por su lista negra de 15 corredores?", options: ["Most Wanted", "Underground 2", "Carbon", "Hot Pursuit"], correct: 0, exp: "En Most Wanted debés derrotar a los 15 miembros de la 'Blacklist' para recuperar tu BMW M3 GTR." },
            { q: "¿En qué saga de autos podés explorar festivales abiertos en países como México o Reino Unido?", options: ["Forza Horizon", "Forza Motorsport", "Project CARS", "iRacing"], correct: 0, exp: "A diferencia de Forza Motorsport (circuitos), Forza Horizon ofrece conducción libre en mundo abierto." },
            { q: "¿Qué juego combina partidos de fútbol con autos propulsados por cohetes?", options: ["Rocket League", "Twisted Metal", "TrackMania", "Wreckfest"], correct: 0, exp: "Rocket League es uno de los juegos competitivos más populares por su física de balón y acrobacias aéreas." },
            { q: "¿Qué marsupial tuvo su propio juego de karts en 1999 llamado CTR?", options: ["Crash Bandicoot (Crash Team Racing)", "Sonic", "Spyro", "Donkey Kong"], correct: 0, exp: "Crash Team Racing fue el gran rival de Mario Kart en la primera PlayStation." }
        ],
        "Deportes": [
            { q: "¿En qué año se lanzó el primer FIFA International Soccer de EA Sports?", options: ["1993", "1998", "2000", "1990"], correct: 0, exp: "El primer FIFA salió a fines de 1993 con vista isométrica y selecciones nacionales." },
            { q: "¿Cómo se llamaba la saga de fútbol de Konami que competía con FIFA?", options: ["PES / Winning Eleven", "Virtua Striker", "PC Fútbol", "Actua Soccer"], correct: 0, exp: "Pro Evolution Soccer (hoy eFootball) dominó la era de PlayStation 2 por su jugabilidad realista." },
            { q: "¿Qué saga lidera los simuladores de básquetbol de la liga estadounidense?", options: ["NBA 2K", "NBA Live", "NBA Jam", "Street Hoops"], correct: 0, exp: "NBA 2K recrea equipos actuales, leyendas históricas y un modo carrera cinematográfico." },
            { q: "¿Qué leyenda del skate dio nombre a la saga más famosa de patineta?", options: ["Tony Hawk (Pro Skater)", "Rodney Mullen", "Bam Margera", "Ryan Sheckler"], correct: 0, exp: "Tony Hawk's Pro Skater (1999) popularizó los combos de trucos y una banda sonora icónica." },
            { q: "¿Qué juego de fútbol arcade de los 90 permitía hacer súper tiros con fuego?", options: ["International Superstar Soccer", "Football Manager", "FIFA 23", "Top Eleven"], correct: 0, exp: "Fue el antecesor directo de Winning Eleven y Pro Evolution Soccer en Super Nintendo." },
            { q: "¿En qué juego te ponés en el rol de director técnico sin controlar a los jugadores en la cancha?", options: ["Football Manager", "FIFA Street", "Rocket League", "eFootball"], correct: 0, exp: "Football Manager se enfoca 100% en tácticas, fichajes, finanzas y gestión de vestuario." }
        ]
    };

    for (const key in bancosRespaldoLocal) {
        if (genreLower.includes(key.toLowerCase()) || key.toLowerCase().includes(genreLower)) {
            return bancosRespaldoLocal[key];
        }
    }
    return bancosRespaldoLocal["Acción y Aventura"];
}

// Prioriza el banco manual completo (y mezcla con Aiven si hay preguntas) para superar el 60% y dar explicaciones
async function fetchPreguntasBD(genre, level) {
    const manuales = obtenerBancoManualPorGenero(genre);
    // Mezclamos aleatoriamente las preguntas manuales
    const mezcladas = [...manuales].sort(() => Math.random() - 0.5);
    return mezcladas;
}

async function iniciarQuiz(genre, level) {
    score = 0;
    currentIndex = 0;
    puntosPartidaPendientes = 0;
    multiplicadorPuntos = 1;
    escudoActivo = false;
    preguntaRespondida = false;

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
        <div id="options-container" class="options-grid"></div>
        <div id="feedback-box" style="display: none; margin-top: 15px; padding: 12px; border-radius: 8px; border: 1px solid #00feff; background: rgba(0, 254, 255, 0.1); text-align: left;">
            <p id="feedback-status" style="font-weight: bold; margin: 0 0 6px 0; font-size: 0.95rem;"></p>
            <p id="feedback-text" style="color: #e0e0e0; font-size: 0.85rem; margin: 0 0 12px 0; line-height: 1.4;"></p>
            <button id="btn-next-question" class="btn-powerup" style="width: 100%; background: #00feff; color: #000; font-weight: bold; border: none; padding: 10px;">
                Siguiente Pregunta ➔
            </button>
        </div>
    `;

    bancoMezclado = await fetchPreguntasBD(genre, level);
    loadQuestion();
}

function loadQuestion() {
    if (!bancoMezclado || currentIndex >= bancoMezclado.length) return;
    preguntaRespondida = false;
    const q = bancoMezclado[currentIndex];

    const qEl = document.getElementById("question");
    const optionsGrid = document.getElementById("options-container");
    const feedbackBox = document.getElementById("feedback-box");

    if (feedbackBox) feedbackBox.style.display = "none";
    if (qEl) qEl.innerText = q.enunciado || q.q;

    const opciones = q.opciones || q.options;
    if (optionsGrid) {
        optionsGrid.innerHTML = "";
        opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            const textoOpt = typeof opt === 'object' ? opt.texto_opcion : opt;
            btn.innerText = textoOpt;
            btn.className = "btn-option";
            btn.style.display = "block";
            btn.style.opacity = "1";
            btn.disabled = false;
            btn.dataset.index = i;
            btn.onclick = () => checkAnswer(i, q);
            optionsGrid.appendChild(btn);
        });
    }

    if (typeof Tienda !== "undefined") {
        Tienda.actualizarUI();
    }
}

function checkAnswer(index, q) {
    if (preguntaRespondida) return;
    preguntaRespondida = true;

    const opciones = q.opciones || q.options;
    const optSeleccionada = opciones[index];
    const botones = Array.from(document.querySelectorAll("#options-container .btn-option"));

    let esCorrecta = false;
    let indiceCorrecto = q.correct;

    if (typeof optSeleccionada === 'object') {
        esCorrecta = (optSeleccionada.es_correcta === 1 || optSeleccionada.es_correcta === true);
        indiceCorrecto = opciones.findIndex(o => o.es_correcta === 1 || o.es_correcta === true);
    } else {
        esCorrecta = (index === q.correct);
    }

    // Colorear botones para feedback visual inmediato
    botones.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === indiceCorrecto) {
            btn.style.background = "rgba(0, 255, 102, 0.25)";
            btn.style.borderColor = "#00ff66";
            btn.style.color = "#00ff66";
        } else if (idx === index && !esCorrecta) {
            btn.style.background = "rgba(255, 0, 85, 0.25)";
            btn.style.borderColor = "#ff0055";
            btn.style.color = "#ff0055";
        } else {
            btn.style.opacity = "0.5";
        }
    });

    const feedbackBox = document.getElementById("feedback-box");
    const feedbackStatus = document.getElementById("feedback-status");
    const feedbackText = document.getElementById("feedback-text");
    const btnNext = document.getElementById("btn-next-question");

    const explicacion = q.exp || "Dato clave de la historia de los videojuegos.";

    if (esCorrecta) {
        if (typeof Sonidos !== "undefined" && typeof Sonidos.playAcierto === "function") Sonidos.playAcierto();

        let puntosBase = 20;
        const diffLower = (selectedLevel || "").toLowerCase();
        if (diffLower.includes("media") || diffLower.includes("medio")) puntosBase = 40;
        else if (diffLower.includes("difícil") || diffLower.includes("dificil")) puntosBase = 80;

        const puntosGanados = puntosBase * multiplicadorPuntos;
        score += puntosGanados;
        puntosPartidaPendientes += puntosGanados;
        multiplicadorPuntos = 1;

        const scoreDisp = document.getElementById("score-display");
        if (scoreDisp) scoreDisp.innerText = `Puntos: ${score}`;

        if (feedbackBox && feedbackStatus && feedbackText && btnNext) {
            feedbackBox.style.borderColor = "#00ff66";
            feedbackBox.style.background = "rgba(0, 255, 102, 0.1)";
            feedbackStatus.style.color = "#00ff66";
            feedbackStatus.innerText = `✅ ¡CORRECTO! (+${puntosGanados} pts)`;
            feedbackText.innerText = `💡 ¿Por qué?: ${explicacion}`;
            btnNext.innerText = "Siguiente Pregunta ➔";
            btnNext.style.background = "#00ff66";
            btnNext.onclick = () => avanzarSiguientePregunta();
            feedbackBox.style.display = "block";
        } else {
            avanzarSiguientePregunta();
        }
    } else {
        if (escudoActivo) {
            escudoActivo = false;
            if (typeof Sonidos !== "undefined" && typeof Sonidos.playPowerUp === "function") Sonidos.playPowerUp();

            if (feedbackBox && feedbackStatus && feedbackText && btnNext) {
                feedbackBox.style.borderColor = "#ffe600";
                feedbackBox.style.background = "rgba(255, 230, 0, 0.1)";
                feedbackStatus.style.color = "#ffe600";
                feedbackStatus.innerText = "🛡️ ¡EL ESCUDO TE SALVÓ!";
                feedbackText.innerText = `💡 Explicación: ${explicacion}`;
                btnNext.innerText = "Continuar Partida ➔";
                btnNext.style.background = "#ffe600";
                btnNext.onclick = () => avanzarSiguientePregunta();
                feedbackBox.style.display = "block";
            }
            return;
        }

        if (typeof Sonidos !== "undefined" && typeof Sonidos.playError === "function") Sonidos.playError();

        if (feedbackBox && feedbackStatus && feedbackText && btnNext) {
            feedbackBox.style.borderColor = "#ff0055";
            feedbackBox.style.background = "rgba(255, 0, 85, 0.15)";
            feedbackStatus.style.color = "#ff0055";
            feedbackStatus.innerText = "❌ RESPUESTA INCORRECTA";
            feedbackText.innerText = `💡 Explicación: ${explicacion}`;
            btnNext.innerText = "Ver Resultado Final ➔";
            btnNext.style.background = "#ff0055";
            btnNext.style.color = "#fff";
            btnNext.onclick = () => mostrarGameOver();
            feedbackBox.style.display = "block";
        } else {
            mostrarGameOver();
        }
    }
}

function avanzarSiguientePregunta() {
    currentIndex++;
    if (currentIndex >= bancoMezclado.length && (selectedLevel || "").toLowerCase().includes("infinito")) {
        fetchPreguntasBD(selectedGenre, selectedLevel).then(nuevas => {
            bancoMezclado = bancoMezclado.concat(nuevas);
            loadQuestion();
        });
    } else if (currentIndex < bancoMezclado.length) {
        loadQuestion();
    } else {
        mostrarPantallaFinal();
    }
}

function mostrarGameOver() {
    if (puntosPartidaPendientes > 0) {
        guardarProgresoManual();
    }
    const quizArea = document.getElementById("quiz");
    const gameOverScreen = document.getElementById("game-over-screen");
    if (quizArea) quizArea.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "block";
    const scoreOver = document.getElementById("score-over");
    if (scoreOver) scoreOver.innerText = score;
}

function mostrarPantallaFinal() {
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
    if (typeof Tienda === "undefined" || preguntaRespondida) return;
    if (!Tienda.inventario[tipo] || Tienda.inventario[tipo] <= 0) return;

    const q = bancoMezclado[currentIndex];
    if (!q) return;

    if (typeof Sonidos !== "undefined" && typeof Sonidos.playPowerUp === "function") Sonidos.playPowerUp();

    if (tipo === 'mitad') {
        const botones = Array.from(document.querySelectorAll("#options-container .btn-option"));
        const opciones = q.opciones || q.options;
        let eliminadas = 0;

        botones.forEach((btn, idx) => {
            const opt = opciones[idx];
            const esCorrecta = typeof opt === 'object'
                ? (opt.es_correcta === 1 || opt.es_correcta === true)
                : (idx === q.correct);

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
        avanzarSiguientePregunta();

    } else if (tipo === 'doble') {
        multiplicadorPuntos = 2;
        Tienda.usarItem('doble');
    }
}

async function volverAlMenu() {
    if (typeof Sonidos !== "undefined" && typeof Sonidos.playClic === "function") Sonidos.playClic();
    if (puntosPartidaPendientes > 0) await guardarProgresoManual();

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