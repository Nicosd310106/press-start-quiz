const questions = [
    // --- FÁCIL ---
    { q: "¿Quién es el protagonista de The Legend of Zelda?", options: ["Zelda", "Link", "Ganon", "Tingle"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el bloque principal de Minecraft?", options: ["Diamante", "Pasto", "Tierra", "Piedra"], correct: 1, level: "Fácil" },
    { q: "¿En qué consola debutó Super Mario Bros?", options: ["NES", "Sega Genesis", "Atari", "SNES"], correct: 0, level: "Fácil" },
    { q: "¿Cómo se llama el dinosaurio verde de Mario?", options: ["Poochy", "Yoshi", "Birdo", "Koopa"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el color de Pac-Man?", options: ["Rojo", "Azul", "Amarillo", "Verde"], correct: 2, level: "Fácil" },
    { q: "¿Qué animal es Sonic?", options: ["Gato", "Erizo", "Zorro", "Perro"], correct: 1, level: "Fácil" },
    { q: "¿Qué fruta come Pac-Man para poder comer fantasmas?", options: ["Manzana", "Cereza", "Frutilla", "Píldora de energía"], correct: 3, level: "Fácil" },
    { q: "¿En qué juego de Nintendo usas una aspiradora para cazar fantasmas?", options: ["Mario Kart", "Luigis Mansion", "Super Mario Party", "Donkey Kong"], correct: 1, level: "Fácil" },
    { q: "¿Cómo se llama el reino donde vive la Princesa Peach?", options: ["Reino Champiñón", "Hyrule", "Dream Land", "Isla Delfino"], correct: 0, level: "Fácil" },
    { q: "¿Cuál es el color de la gorra de Luigi?", options: ["Rojo", "Azul", "Verde", "Amarillo"], correct: 2, level: "Fácil" },
    { q: "¿En qué juego construyes ciudades con bloques de colores?", options: ["Minecraft", "Tetris", "Roblox", "LEGO Worlds"], correct: 0, level: "Fácil" },
    { q: "¿Quién es el archienemigo de Sonic?", options: ["Shadow", "Knuckles", "Dr. Eggman", "Tails"], correct: 2, level: "Fácil" },
    { q: "¿Qué tipo de animal es Donkey Kong?", options: ["Chimpancé", "Gorila", "Orangután", "Mandril"], correct: 1, level: "Fácil" },
    { q: "¿Cómo se llama el arma principal en Star Wars Battlefront?", options: ["Espada láser", "Bláster", "Arco", "Lanza"], correct: 1, level: "Fácil" },
    { q: "¿Cuál es el nombre del perro de Duck Hunt?", options: ["No tiene nombre oficial", "Buster", "Max", "Buddy"], correct: 0, level: "Fácil" },

    // --- MEDIA ---
    { q: "¿En qué año se lanzó Resident Evil 4 (Original)?", options: ["2004", "2005", "2006", "2003"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama el padre de Kratos en God of War?", options: ["Ares", "Zeus", "Hades", "Poseidón"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama la ciudad donde ocurre GTA V?", options: ["Liberty City", "Vice City", "Los Santos", "San Fierro"], correct: 2, level: "Media" },
    { q: "¿Cuál es el nombre real de Master Chief en Halo?", options: ["John", "Cortana", "Arbiter", "Marcus"], correct: 0, level: "Media" },
    { q: "¿Quién creó la serie Metal Gear?", options: ["Shigeru Miyamoto", "Hideo Kojima", "Shinji Mikami", "Eiji Aonuma"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama el bar donde trabaja Tifa en Final Fantasy VII?", options: ["Seventh Heaven", "Blue Moon", "Starlight", "Sector 7"], correct: 0, level: "Media" },
    { q: "¿Cuál es el nombre del mapa original de Among Us?", options: ["Mira HQ", "The Skeld", "Polus", "The Airship"], correct: 1, level: "Media" },
    { q: "¿En qué juego aparece la frase 'The Cake is a Lie'?", options: ["Half-Life", "Portal", "Team Fortress 2", "BioShock"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama el caballo de Link en Zelda?", options: ["Zelda", "Agro", "Epona", "Swift"], correct: 2, level: "Media" },
    { q: "¿Cuál es la debilidad de un Creeper en Minecraft?", options: ["El agua", "Los gatos", "La lava", "La nieve"], correct: 1, level: "Media" },
    { q: "¿Qué personaje dice la frase 'Get over here!'?", options: ["Sub-Zero", "Scorpion", "Raiden", "Liu Kang"], correct: 1, level: "Media" },
    { q: "¿Cómo se llama la inteligencia artificial que guía a Master Chief?", options: ["Siri", "Cortana", "Alexa", "Glados"], correct: 1, level: "Media" },
    { q: "¿En qué isla transcurre el primer Crash Bandicoot?", options: ["Isla Wumpa", "Isla N. Sanity", "Isla Tortuga", "Isla Mecha"], correct: 1, level: "Media" },
    { q: "¿Cuál es el nombre real del Agente 47?", options: ["Desconocido", "Tobias Rieper", "John Doe", "Arthur"], correct: 1, level: "Media" },
    { q: "¿Quién es el protagonista de Red Dead Redemption 2?", options: ["John Marston", "Arthur Morgan", "Dutch van der Linde", "Bill Williamson"], correct: 1, level: "Media" },

    // --- DIFÍCIL ---
    { q: "¿Cuál fue el primer nombre de Mario?", options: ["Jumpman", "Mr. Video", "Plumber Man", "Luigi"], correct: 0, level: "Difícil" },
    { q: "¿Qué estudio desarrolló el juego 'Bloodborne'?", options: ["Bluepoint", "FromSoftware", "Team Cherry", "Ubisoft"], correct: 1, level: "Difícil" },
    { q: "¿En qué año salió la primera PlayStation en Japón?", options: ["1992", "1994", "1995", "1993"], correct: 1, level: "Difícil" },
    { q: "¿Cuál fue el primer juego en usar la tecnología Mode 7?", options: ["Super Mario World", "F-Zero", "Star Fox", "Pilotwings"], correct: 1, level: "Difícil" },
    { q: "¿Cómo se llamaba la empresa antes de ser Nintendo?", options: ["Marufuku", "Yamauchi Co.", "Nintendo Playing Card", "Hanafuda Corp"], correct: 0, level: "Difícil" },
    { q: "¿En qué año se lanzó el primer Castlevania en Japón?", options: ["1984", "1986", "1988", "1985"], correct: 1, level: "Difícil" },
    { q: "¿Cómo se llama el primer coloso en Shadow of the Colossus?", options: ["Quadratus", "Valus", "Gaius", "Phaedra"], correct: 1, level: "Difícil" },
    { q: "¿Cuál fue el primer juego de FromSoftware?", options: ["Demons Souls", "Kings Field", "Armored Core", "Dark Souls"], correct: 1, level: "Difícil" },
    { q: "¿Cómo se llama la moneda oficial en el juego Fallout?", options: ["Dólares", "Tapas de botella", "Créditos", "Pepitas"], correct: 1, level: "Difícil" },
    { q: "¿En qué lenguaje de programación fue escrito Minecraft originalmente?", options: ["C++", "Python", "Java", "C#"], correct: 2, level: "Difícil" },
    { q: "¿Cuál es el nombre del villano final en Final Fantasy VI?", options: ["Sephiroth", "Kefka", "Exdeath", "Kuja"], correct: 1, level: "Difícil" },
    { q: "¿Cómo se llama el planeta natal de los Elites en Halo?", options: ["Reach", "Sanghelios", "Doisac", "Eayn"], correct: 1, level: "Difícil" },
    { q: "¿Qué juego ostenta el récord de ser el más vendido de la historia?", options: ["Tetris", "Minecraft", "GTA V", "Wii Sports"], correct: 1, level: "Difícil" },
    { q: "¿Cómo se llamaba originalmente el proyecto de la consola Xbox?", options: ["DirectX Box", "Midway", "Project Natal", "Marz"], correct: 0, level: "Difícil" },
    { q: "¿Cuál es el nombre de la corporación villana en Mirrors Edge?", options: ["Abstergo", "Umbrella", "Callaghan", "Pirandello Kruger"], correct: 3, level: "Difícil" }
];

let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = ""; 

const menuEl = document.getElementById("menu");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

// 1. ESCUCHAR CLICS EN BOTONES
document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        nivelActualLabel = btn.getAttribute("data-level"); 
        iniciarQuiz(nivelActualLabel);
    });
});

// 2. INICIAR EL JUEGO
function iniciarQuiz(nivel) {
    if (nivel === "Todas") {
        bancoMezclado = [...questions].sort(() => Math.random() - 0.5);
    } else {
        bancoMezclado = questions.filter(q => q.level === nivel).sort(() => Math.random() - 0.5);
    }

    score = 0;
    currentIndex = 0;
    
    document.getElementById("score-display").innerText = "Puntos: 0";
    document.getElementById("difficulty-badge").innerText = nivelActualLabel; 
    
    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";

    loadQuestion();
}

// 3. CARGAR PREGUNTA
function loadQuestion() {
    const q = bancoMezclado[currentIndex];
    document.getElementById("question").innerText = q.q;
    
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

// 4. CHEQUEAR RESPUESTA
function checkAnswer(index) {
    if (index === bancoMezclado[currentIndex].correct) {
        score += 10;
        document.getElementById("score-display").innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            // Pantalla de Ganador
            quizArea.innerHTML = `
                <h2 style="color: #00feff;">¡GG! Completaste el Quiz</h2>
                <p style="font-size: 1.5rem;">Puntaje final: ${score}</p>
                <button class='btn-option' onclick='volverAlMenu()'>VOLVER AL MENÚ</button>
            `;
        }
    } else {
        // Pantalla de Perdedor
        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;
    }
}

// 5. RESETEAR TODO PARA VOLVER A JUGAR
function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    
    quizArea.innerHTML = `
        <h2 id="question">Cargando pregunta...</h2>
        <div id="options-container"></div>
    `;
    
    gameEl.style.display = "none";
    gameOverScreen.style.display = "none";
    menuEl.style.display = "block";
}
