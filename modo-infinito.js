/**
 * modo-infinito.js
 * Módulo para gestionar el Modo Infinito en Press Start Quiz.
 */

const ModoInfinito = {
  activo: false,
  rachaActual: 0,
  mejorRacha: 0,
  preguntasBuffer: [],
  preguntasUsadasTextos: [],
  cargandoSegundoPlano: false,
  generarCallback: null,
  
  // Claves para localStorage
  STORAGE_BEST_STREAK: 'press_start_quiz_best_streak',

  init(generarFn) {
    this.generarCallback = generarFn;
    this.cargarMejorRacha();
  },

  iniciarModo(genero) {
    this.activo = true;
    this.rachaActual = 0;
    this.preguntasBuffer = [];
    this.preguntasUsadasTextos = [];
    this.cargandoSegundoPlano = false;
  },

  desactivar() {
    this.activo = false;
    this.rachaActual = 0;
    this.preguntasBuffer = [];
    this.preguntasUsadasTextos = [];
    this.cargandoSegundoPlano = false;
  },

  cargarMejorRacha() {
    const guardado = localStorage.getItem(this.STORAGE_BEST_STREAK);
    this.mejorRacha = guardado ? parseInt(guardado, 10) : 0;
  },

  guardarMejorRacha() {
    if (this.rachaActual > this.mejorRacha) {
      this.mejorRacha = this.rachaActual;
      localStorage.setItem(this.STORAGE_BEST_STREAK, this.mejorRacha.toString());
    }
  },

  registrarAcierto() {
    this.rachaActual++;
    this.guardarMejorRacha();
  },

  registrarPreguntaUsada(textoPregunta) {
    if (textoPregunta && !this.preguntasUsadasTextos.includes(textoPregunta)) {
      this.preguntasUsadasTextos.push(textoPregunta);
      if (this.preguntasUsadasTextos.length > 40) {
        this.preguntasUsadasTextos.shift();
      }
    }
  },

  async solicitarTandaSegundoPlano(genero) {
    if (this.cargandoSegundoPlano || !this.activo) return;

    this.cargandoSegundoPlano = true;
    const banner = document.getElementById('infinite-loader');
    if (banner) banner.style.display = 'block';

    try {
      const nuevasPreguntas = await this.generarCallback(
        genero, 
        'Todas', 
        5, 
        this.preguntasUsadasTextos
      );

      if (Array.isArray(nuevasPreguntas) && nuevasPreguntas.length > 0) {
        this.preguntasBuffer.push(...nuevasPreguntas);
      }
    } catch (e) {
      console.warn("ModoInfinito: Error al solicitar preguntas en segundo plano.", e);
    } finally {
      this.cargandoSegundoPlano = false;
      if (banner) banner.style.display = 'none';
    }
  },

  evaluarPrecarga(genero) {
    if (this.activo && this.preguntasBuffer.length <= 2 && !this.cargandoSegundoPlano) {
      this.solicitarTandaSegundoPlano(genero);
    }
  },

  obtenerSiguientePregunta() {
    if (this.preguntasBuffer.length > 0) {
      const q = this.preguntasBuffer.shift();
      this.registrarPreguntaUsada(q.q);
      return q;
    }
    return null;
  }
};