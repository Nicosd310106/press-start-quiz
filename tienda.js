/**
 * tienda.js - Módulo de ayudas / tienda estilo roguelike con sincronización Aiven
 */

const Tienda = {
  puntosDisponibles: 0,
  inventario: {
    mitad: 0,   // Quita 2 opciones incorrectas (50/50)
    escudo: 0,  // Perdona 1 fallo
    saltar: 0,  // Cambia de pregunta sin perder
    doble: 0    // Duplica los puntos de la siguiente
  },
  
  PRECIOS: {
    mitad: 30,
    escudo: 50,
    saltar: 20,
    doble: 40
  },

  STORAGE_PUNTOS: 'press_start_quiz_puntos_tienda',
  STORAGE_INVENTARIO: 'press_start_quiz_inventario',

  init() {
    this.cargarDatos();
  },

  cargarDatos() {
    const pts = localStorage.getItem(this.STORAGE_PUNTOS);
    this.puntosDisponibles = pts ? parseInt(pts, 10) : 0;

    const inv = localStorage.getItem(this.STORAGE_INVENTARIO);
    if (inv) {
      try {
        this.inventario = JSON.parse(inv);
      } catch (e) {
        console.warn('Error leyendo inventario de localStorage');
      }
    }
  },

  guardarDatos() {
    localStorage.setItem(this.STORAGE_PUNTOS, this.puntosDisponibles.toString());
    localStorage.setItem(this.STORAGE_INVENTARIO, JSON.stringify(this.inventario));
  },

  // Sincroniza al finalizar una ronda enviando puntos al servidor de Aiven
  async sumarPuntos(puntos) {
    this.puntosDisponibles += puntos;
    this.guardarDatos();

    const userId = localStorage.getItem('press_start_user_id');
    if (userId) {
      try {
        await fetch('/api/partida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, puntosObtenidos: puntos })
        });
      } catch (err) {
        console.error('Error al sincronizar puntos con Aiven:', err);
      }
    }
  },

  comprarItem(itemKey) {
    const precio = this.PRECIOS[itemKey];
    if (precio && this.puntosDisponibles >= precio) {
      this.puntosDisponibles -= precio;
      this.inventario[itemKey] = (this.inventario[itemKey] || 0) + 1;
      this.guardarDatos();

      if (typeof Sonidos !== 'undefined' && typeof Sonidos.playCompra === 'function') {
        Sonidos.playCompra();
      }
      return true;
    }
    return false;
  },

  usarItem(itemKey) {
    if (this.inventario[itemKey] && this.inventario[itemKey] > 0) {
      this.inventario[itemKey]--;
      this.guardarDatos();
      return true;
    }
    return false;
  }
};

Tienda.init();