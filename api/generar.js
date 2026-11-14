import { dbPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const genre = req.method === 'POST' ? req.body.genre : req.query.genre;
    const level = req.method === 'POST' ? req.body.level : req.query.level;
    const generoBuscado = genre || 'Simulación';
    const dificultadBuscada = level || 'Fácil';

    try {
        // 1. Intentar obtener preguntas reales cargadas en MySQL Aiven
        const [preguntasBD] = await dbPool.execute(
            `SELECT p.id, p.enunciado AS q 
             FROM preguntas p 
             JOIN categorias c ON p.categoria_id = c.id 
             WHERE LOWER(c.nombre) LIKE LOWER(?) AND LOWER(p.dificultad) = LOWER(?) 
             ORDER BY RAND() LIMIT 10`,
            [`%${generoBuscado}%`, dificultadBuscada]
        );

        if (preguntasBD && preguntasBD.length > 0) {
            const preguntasCompletas = await Promise.all(preguntasBD.map(async (p) => {
                const [opciones] = await dbPool.execute(
                    'SELECT texto_opcion, es_correcta FROM opciones WHERE pregunta_id = ?',
                    [p.id]
                );
                
                const optionsTexts = opciones.map(o => o.texto_opcion);
                const correctIndex = opciones.findIndex(o => o.es_correcta === 1 || o.es_correcta === true);

                return {
                    q: p.q,
                    options: optionsTexts,
                    correct: correctIndex >= 0 ? correctIndex : 0
                };
            }));

            return res.status(200).json(preguntasCompletas);
        }
    } catch (error) {
        console.error("Error consultando MySQL:", error);
    }

    // 2. BANCO DE RESPALDO CON PREGUNTAS REALES PARA LOS 10 GÉNEROS
    const bancoRespuestasReales = {
        "Simulación": [
            { q: "¿Qué simulador de vida fue creado originalmente por Will Wright?", options: ["The Sims", "Animal Crossing", "Second Life", "Minecraft"], correct: 0 },
            { q: "¿En qué simulador de aviación podés volar aviones comerciales con clima en tiempo real?", options: ["Flight Simulator", "X-Plane", "FlightGear", "DCS World"], correct: 0 },
            { q: "¿Qué juego te permite gestionar una granja moderna con maquinaria real?", options: ["Farming Simulator", "Stardew Valley", "Hay Day", "FarmVille"], correct: 0 }
        ],
        "Survival Horror": [
            { q: "¿Qué estudio desarrolló originalmente la saga Silent Hill?", options: ["Capcom", "Team Silent (Konami)", "Shinra", "Square Enix"], correct: 1 },
            { q: "¿En qué año se lanzó el primer Resident Evil?", options: ["1996", "1998", "2000", "1994"], correct: 0 },
            { q: "¿Cómo se llama la ciudad infestada en Resident Evil 2 y 3?", options: ["Raccoon City", "Silent Hill", "Bright Falls", "Rapture"], correct: 0 }
        ],
        "Deportes": [
            { q: "¿En qué año se lanzó el primer FIFA de EA Sports?", options: ["1993", "1998", "2000", "1990"], correct: 0 },
            { q: "¿Qué saga de fútbol arcade perteneció a Konami?", options: ["PES / Winning Eleven", "FIFA", "Virtua Striker", "Red Card"], correct: 0 },
            { q: "¿En qué saga jugás en la liga profesional de básquet?", options: ["NBA 2K", "NBA Jam", "Basketball Life", "Courtside"], correct: 0 }
        ],
        "Carreras": [
            { q: "¿Qué saga exclusiva de PlayStation se destaca por ser 'The Real Driving Simulator'?", options: ["Gran Turismo", "Need for Speed", "Forza Motorsport", "Burnout"], correct: 0 },
            { q: "¿Qué franquicia de carreras incluye ítems como caparazones y plátanos?", options: ["Mario Kart", "Sonic Racing", "Crash Team Racing", "Wacky Races"], correct: 0 },
            { q: "¿Qué juego es famoso por sus persecuciones policiales y tuning?", options: ["Need for Speed: Most Wanted", "Gran Turismo 4", "Driveclub", "Grid"], correct: 0 }
        ],
        "Lucha": [
            { q: "¿Qué franquicia creó el famoso movimiento 'Hadoken'?", options: ["Street Fighter", "Mortal Kombat", "Tekken", "King of Fighters"], correct: 0 },
            { q: "¿En qué juego de peleas se ejecutan las 'Fatalities'?", options: ["Mortal Kombat", "Tekken", "Injustice", "Dead or Alive"], correct: 0 }
        ],
        "RPG": [
            { q: "¿Cuál es el mundo fantástico donde transcurre la saga The Witcher?", options: ["El Continente", "Tamriel", "Hyrule", "Azeroth"], correct: 0 },
            { q: "¿Qué estudio desarrolló Skyrim y Fallout 4?", options: ["Bethesda Game Studios", "Bioware", "Square Enix", "CD Projekt Red"], correct: 0 }
        ],
        "Shooter": [
            { q: "¿Qué mapa emblemático pertenece a la saga Counter-Strike?", options: ["de_dust2", "Nuketown", "Wake Island", "Blood Gulch"], correct: 0 },
            { q: "¿Cómo se llama el protagonista de la saga Halo?", options: ["Master Chief", "Marcus Fenix", "Doom Slayer", "Gordon Freeman"], correct: 0 }
        ],
        "Acción y Aventura": [
            { q: "¿Cómo se llama el explorador protagonista de la saga Uncharted?", options: ["Nathan Drake", "Lara Croft", "Arthur Morgan", "Kratos"], correct: 0 },
            { q: "¿En qué videojuego encarnas a Kratos en la mitología nórdica y griega?", options: ["God of War", "Devil May Cry", "Darksiders", "Bayonetta"], correct: 0 }
        ],
        "Plataformas": [
            { q: "¿En qué año se lanzó el icónico Super Mario Bros de NES?", options: ["1985", "1983", "1990", "1988"], correct: 0 },
            { q: "¿Qué marsupial naranja es la mascota clásica de las plataformas de PlayStation?", options: ["Crash Bandicoot", "Spyro", "Rayman", "Jak"], correct: 0 }
        ],
        "Estrategia": [
            { q: "¿Qué juego de estrategia en tiempo real popularizó la frase 'Wololo'?", options: ["Age of Empires", "StarCraft", "Warcraft III", "Command & Conquer"], correct: 0 },
            { q: "¿Qué saga se enfoca en turnos y conquista mundial desde la antigüedad?", options: ["Civilization", "Total War", "StarCraft", "Company of Heroes"], correct: 0 }
        ]
    };

    // Buscar coincidencia en el banco de respuestas reales
    let preguntasResultado = [];
    for (const key in bancoRespuestasReales) {
        if (generoBuscado.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(generoBuscado.toLowerCase())) {
            preguntasResultado = bancoRespuestasReales[key];
            break;
        }
    }

    if (preguntasResultado.length === 0) {
        preguntasResultado = bancoRespuestasReales["Simulación"];
    }

    return res.status(200).json(preguntasResultado);
}