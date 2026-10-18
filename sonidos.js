/**
 * sonidos.js - Efectos de sonido retro de 8 bits con Web Audio API
 */

const Sonidos = {
    ctx: null,
    activado: true,

    // Inicializa o reanuda el contexto de audio tras la interacción del usuario
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    },

    // Sonido al hacer clic en un botón o navegar
    playClic() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(400, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {
            console.warn("Error reproduciendo Clic:", e);
        }
    },

    // Sonido de respuesta correcta (Arpegio ascendente)
    playAcierto() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        const notas = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do
        const dur = 0.07;

        notas.forEach((freq, idx) => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * dur);

                gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * dur);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (idx + 1) * dur);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(this.ctx.currentTime + idx * dur);
                osc.stop(this.ctx.currentTime + (idx + 1) * dur);
            } catch (e) {}
        });
    },

    // Sonido de error o Game Over
    playError() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.25);
        } catch (e) {}
    },

    // Sonido de compra en la Tienda (Moneda retro)
    playCompra() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
            osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.25);
        } catch (e) {}
    },

    // Sonido al activar un Comodín / Power-Up
    playPowerUp() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        } catch (e) {}
    }
};

// Escuchadores globales para activar el audio en la primera interacción del usuario
window.addEventListener('click', () => Sonidos.init(), { once: true });
window.addEventListener('touchstart', () => Sonidos.init(), { once: true });
window.addEventListener('keydown', () => Sonidos.init(), { once: true });