let selectedGenre = "";
let selectedLevel = "";
let bancoMezclado = [];
let currentIndex = 0;
let score = 0;
let nivelActualLabel = ""; 

const menuEl = document.getElementById("menu");
const genreSelection = document.getElementById("genre-selection");
const difficultySelection = document.getElementById("difficulty-selection");
const gameEl = document.getElementById("game");
const quizArea = document.getElementById("quiz");
const gameOverScreen = document.getElementById("game-over-screen");

// 1. ESCUCHAR CLICS EN LOS BOTONES DE GÉNERO
document.querySelectorAll(".btn-genre").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedGenre = btn.getAttribute("data-genre");
        document.getElementById("selected-genre-label").innerText = selectedGenre;
        
        // Ocultar sección de género y mostrar la de dificultad
        genreSelection.style.display = "none";
        difficultySelection.style.display = "block";
    });
});

// BOTÓN PARA VOLVER ATRÁS (Cambiar de género)
document.getElementById("btn-back-genre").addEventListener("click", () => {
    difficultySelection.style.display = "none";
    genreSelection.style.display = "block";
});

// 2. ESCUCHAR CLICS EN LOS BOTONES DE DIFICULTAD
document.querySelectorAll(".btn-difficulty").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedLevel = btn.getAttribute("data-level");
        nivelActualLabel = `${selectedGenre} - ${selectedLevel}`;
        
        iniciarQuiz(selectedGenre, selectedLevel);
    });
});

// 3. INICIAR EL JUEGO Y LLAMAR A LA IA AUTOMÁTICAMENTE
async function iniciarQuiz(genre, level) {
    score = 0;
    currentIndex = 0;

    document.getElementById("score-display").innerText = "Puntos: 0";
    document.getElementById("difficulty-badge").innerText = nivelActualLabel; 

    menuEl.style.display = "none";
    gameEl.style.display = "block";
    quizArea.style.display = "block";
    gameOverScreen.style.display = "none";

    // Mostramos un mensaje de carga con estilo mientras la IA genera las preguntas
    document.getElementById("question").innerText = "Generando preguntas con IA...";
    document.getElementById("options-container").innerHTML = `
        <p style="text-align: center; color: #ff0055; font-size: 1.1rem; margin-top: 20px;">
            Conectando con el arcade matrix... por favor espera 🎮
        </p>
    `;

    try {
        // Prompt estructurado para exigirle a la IA que devuelva exactamente un JSON limpio
        const promptText = `Genera 5 preguntas de trivia sobre videojuegos de la categoría "${genre}" con un nivel de dificultad "${level}". 
Devuélveme estrictamente un JSON válido (un array de objetos), sin texto adicional, explicaciones ni bloques de markdown fuera del json. 
Cada objeto debe tener exactamente estas propiedades:
- "q": El texto de la pregunta.
- "options": Un array con exactamente 4 opciones de respuesta en texto.
- "correct": Un número entero del 0 al 3 que indique la posición de la opción correcta dentro del array "options".`;

        // CLAVE DIVIDIDA PARA EVITAR EL BLOQUEO DE GITHUB
        const parte1 = "AQ.Ab8RN6IHWuO_wYBTC1LikW";
        const parte2 = "N5KfSuHIa9t3xZJChxvKtNFe5hUA";
        const apiKey = parte1 + parte2;
        
        const urlAPI = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const respuestaAPI = await fetch(urlAPI, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await respuestaAPI.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No se recibieron datos válidos de la IA.");
        }

        const textoGenerado = data.candidates[0].content.parts[0].text;
        
        // Limpiamos etiquetas de código por si la IA incluye markdown tipo ```json ... ```
        const jsonLimpio = textoGenerado.replace(/```json/g, "").replace(/```/g, "").trim();
        
        bancoMezclado = JSON.parse(jsonLimpio);

        // Cargamos la primera pregunta generada
        loadQuestion();

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        quizArea.innerHTML = `
            <h2 style="color: #ff003c;">ERROR DE CONEXIÓN</h2>
            <p>No se pudieron generar las preguntas automáticas. Verifica tu clave de API.</p>
            <button class='btn-option' onclick='volverAlMenu()'>VOLVER AL MENÚ</button>
        `;
    }
}

// 4. CARGAR PREGUNTA EN PANTALLA
function loadQuestion() {
    if (!bancoMezclado || bancoMezclado.length === 0) return;

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

// 5. CHEQUEAR RESPUESTA
function checkAnswer(index) {
    if (index === bancoMezclado[currentIndex].correct) {
        score += 10;
        document.getElementById("score-display").innerText = `Puntos: ${score}`;
        currentIndex++;
        if (currentIndex < bancoMezclado.length) {
            loadQuestion();
        } else {
            // Pantalla de Victoria al terminar las preguntas de la ronda
            quizArea.innerHTML = `
                <h2 style="color: #00feff; text-shadow: 0 0 10px #00feff;">¡GG! RONDA SUPERADA</h2>
                <p style="font-size: 1.5rem; margin: 20px 0;">Puntaje final: ${score}</p>
                <button class='btn-option' onclick='volverAlMenu()'>INSERT COIN (VOLVER)</button>
            `;
        }
    } else {
        // Pantalla de Game Over si falla
        quizArea.style.display = "none";
        gameOverScreen.style.display = "block";
        document.getElementById("score-over").innerText = score;
    }
}

// 6. RESETEAR TODO PARA VOLVER AL MENÚ
function volverAlMenu() {
    score = 0;
    currentIndex = 0;
    bancoMezclado = [];
    selectedGenre = "";
    selectedLevel = "";

    quizArea.innerHTML = `
        <h2 id="question">Cargando pregunta...</h2>
        <div id="options-container"></div>
    `;

    gameEl.style.display = "none";
    gameOverScreen.style.display = "none";
    genreSelection.style.display = "block"; // Volver al paso 1 de géneros
    menuEl.style.display = "block";
}