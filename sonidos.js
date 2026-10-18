/**
 * sonidos.js - Efectos de sonido retro de 8 bits con Web Audio API
 */

const Sonidos = {
    ctx: null,
    activado: true,

    // Inicializa el contexto de audio tras el primer clic del usuario (requerido por navegadores)
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Sonido al hacer clic en un botón o navegar
    playClic() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },

    // Sonido de respuesta correcta (Arpegio ascendente estilo Mario/Arcade)
    playAcierto() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        const notas = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const duracionNota = 0.08;

        notas.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * duracionNota);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * duracionNota);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (idx + 1) * duracionNota);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + idx * duracionNota);
            osc.stop(this.ctx.currentTime + (idx + 1) * duracionNota);
        });
    },

    // Sonido de error o Game Over (Tono descendente y disonante)
    playError() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.3); // Descanso grave

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    // Sonido de compra en la Tienda (Efecto 'Coin' / Moneda retro)
    playCompra() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    // Sonido al activar un Comodín o Power-Up
    playPowerUp() {
        if (!this.activado) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
};