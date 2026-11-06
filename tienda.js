/**
 * tienda.js - Frontend de compras sincronizado con Aiven MySQL
 */

const Tienda = {
  puntosDisponibles: 0,
  inventario: {
    mitad: 0,
    escudo: 0,
    saltar: 0,
    doble: 0
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
    this.sincronizarConBD();
  },

  cargarDatos() {
    const pts = localStorage.getItem(this.STORAGE_PUNTOS);
    this.puntosDisponibles = pts ? parseInt(pts, 10) : 0;

    const inv = localStorage.getItem(this.STORAGE_INVENTARIO);
    if (inv) {
      try {
        this.inventario = JSON.parse(inv);
      } catch (e) {
        console.warn('Error leyendo inventario local');
      }
    }
    this.actualizarUI();
  },

  async sincronizarConBD() {
    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem('press_start_usuario_actual');
    if (!userId && !usuarioActual) return;

    try {
      const res = await fetch('/api/ranking');
      if (res.ok) {
        const data = await res.json();
        if (data.ranking && Array.isArray(data.ranking)) {
          const usuario = data.ranking.find(u => u.id == userId || u.nickname === usuarioActual);
          if (usuario) {
            this.puntosDisponibles = usuario.puntos_totales;
            this.guardarDatos();
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener el saldo de Aiven MySQL");
    }
  },

  guardarDatos() {
    localStorage.setItem(this.STORAGE_PUNTOS, this.puntosDisponibles.toString());
    localStorage.setItem(this.STORAGE_INVENTARIO, JSON.stringify(this.inventario));
    this.actualizarUI();
  },

  actualizarUI() {
    const spanMenu = document.getElementById("tienda-puntos-menu");
    if (spanMenu) spanMenu.innerText = this.puntosDisponibles;

    const spanShop = document.getElementById("shop-points-display");
    if (spanShop) spanShop.innerText = this.puntosDisponibles;

    const cantMitad = document.getElementById("shop-cant-mitad");
    if (cantMitad) cantMitad.innerText = this.inventario.mitad || 0;

    const cantEscudo = document.getElementById("shop-cant-escudo");
    if (cantEscudo) cantEscudo.innerText = this.inventario.escudo || 0;

    const cantSaltar = document.getElementById("shop-cant-saltar");
    if (cantSaltar) cantSaltar.innerText = this.inventario.saltar || 0;

    const cantDoble = document.getElementById("shop-cant-doble");
    if (cantDoble) cantDoble.innerText = this.inventario.doble || 0;
  },

  async comprarItem(itemKey) {
    const precio = this.PRECIOS[itemKey];
    if (!precio) return false;

    if (this.puntosDisponibles < precio) {
      alert("¡No tienes suficientes puntos!");
      return false;
    }

    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem('press_start_usuario_actual');

    try {
      const res = await fetch('/api/tienda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId ? parseInt(userId, 10) : null,
          nickname: usuarioActual,
          costo: precio
        })
      });

      const data = await res.json();

      if (res.ok && data.exito) {
        this.puntosDisponibles = data.puntosTotales;
        this.inventario[itemKey] = (this.inventario[itemKey] || 0) + 1;
        this.guardarDatos();

        if (typeof Sonidos !== 'undefined' && typeof Sonidos.playCompra === 'function') {
          Sonidos.playCompra();
        }
        return true;
      } else {
        alert(data.error || "No se pudo procesar la compra.");
        return false;
      }
    } catch (e) {
      console.error("Error conectando con /api/tienda:", e);
      this.puntosDisponibles -= precio;
      this.inventario[itemKey] = (this.inventario[itemKey] || 0) + 1;
      this.guardarDatos();
      return true;
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

window.abrirTienda = function() {
  window.location.href = "tienda.html";
};

window.cerrarTienda = function() {
  window.location.href = "index.html";
};

window.comprarComodin = function(tipo) {
  Tienda.comprarItem(tipo);
};

document.addEventListener("DOMContentLoaded", () => {
  Tienda.init();
});