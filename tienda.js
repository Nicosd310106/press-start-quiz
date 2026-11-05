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
    this.actualizarUI();
  },

  guardarDatos() {
    localStorage.setItem(this.STORAGE_PUNTOS, this.puntosDisponibles.toString());
    localStorage.setItem(this.STORAGE_INVENTARIO, JSON.stringify(this.inventario));
    this.actualizarUI();
  },

  actualizarUI() {
    // Actualizar puntos en el menú principal y dentro de la tienda
    const spanMenu = document.getElementById("tienda-puntos-menu");
    if (spanMenu) spanMenu.innerText = this.puntosDisponibles;

    const spanShop = document.getElementById("shop-points-display");
    if (spanShop) spanShop.innerText = this.puntosDisponibles;

    // Actualizar cantidades de comodines dentro de la tienda
    const cantMitad = document.getElementById("shop-cant-mitad");
    if (cantMitad) cantMitad.innerText = this.inventario.mitad || 0;

    const cantEscudo = document.getElementById("shop-cant-escudo");
    if (cantEscudo) cantEscudo.innerText = this.inventario.escudo || 0;

    const cantSaltar = document.getElementById("shop-cant-saltar");
    if (cantSaltar) cantSaltar.innerText = this.inventario.saltar || 0;

    const cantDoble = document.getElementById("shop-cant-doble");
    if (cantDoble) cantDoble.innerText = this.inventario.doble || 0;

    // Actualizar HUD del juego si está en partida
    const hudMitad = document.getElementById("cant-mitad");
    if (hudMitad) hudMitad.innerText = this.inventario.mitad || 0;

    const hudEscudo = document.getElementById("cant-escudo");
    if (hudEscudo) hudEscudo.innerText = this.inventario.escudo || 0;

    const hudSaltar = document.getElementById("cant-saltar");
    if (hudSaltar) hudSaltar.innerText = this.inventario.saltar || 0;

    const hudDoble = document.getElementById("cant-doble");
    if (hudDoble) hudDoble.innerText = this.inventario.doble || 0;
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
    } else {
      alert("¡No tienes suficientes puntos!");
      return false;
    }
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

// -------------------------------------------------------------
// FUNCIONES GLOBALES QUE INVOCA EL HTML (index.html)
// -------------------------------------------------------------
function abrirTienda() {
  const genreSel = document.getElementById("genre-selection");
  const shopScreen = document.getElementById("shop-screen");
  if (genreSel) genreSel.style.display = "none";
  if (shopScreen) {
    shopScreen.style.display = "block";
    Tienda.actualizarUI();
  }
}

function cerrarTienda() {
  const genreSel = document.getElementById("genre-selection");
  const shopScreen = document.getElementById("shop-screen");
  if (shopScreen) shopScreen.style.display = "none";
  if (genreSel) genreSel.style.display = "block";
}

function comprarComodin(tipo) {
  Tienda.comprarItem(tipo);
}

Tienda.init();