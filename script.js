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
            // Guardar puntos ganados en MySQL Aiven
            guardarPuntosEnBD(score);

            // Ocultar área de juego sin destruir sus elementos internos (#question y #options-container)
            const quizArea = document.getElementById("quiz");
            const gameOverScreen = document.getElementById("game-over-screen");
            
            if (quizArea) quizArea.style.display = "none";
            if (gameOverScreen) {
                gameOverScreen.style.display = "block";
                // Usamos la pantalla de fin de juego para mostrar el puntaje final
                const scoreOver = document.getElementById("score-over");
                if (scoreOver) scoreOver.innerText = score;
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