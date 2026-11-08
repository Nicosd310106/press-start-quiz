/**
 * tienda.js - Frontend de compras sincronizado por usuario y Aiven MySQL
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

  getStorageKeys() {
    const usuarioActual = localStorage.getItem("press_start_usuario_actual") || "invitado";
    return {
      pts: `press_start_puntos_${usuarioActual}`,
      inv: `press_start_inventario_${usuarioActual}`
    };
  },

  init() {
    this.cargarDatos();
    this.sincronizarConBD();
  },

  cargarDatos() {
    const keys = this.getStorageKeys();
    const pts = localStorage.getItem(keys.pts);
    this.puntosDisponibles = pts ? parseInt(pts, 10) : 0;

    const inv = localStorage.getItem(keys.inv);
    if (inv) {
      try {
        this.inventario = JSON.parse(inv);
      } catch (e) {
        console.warn('Error leyendo inventario local');
      }
    } else {
      this.inventario = { mitad: 0, escudo: 0, saltar: 0, doble: 0 };
    }
    this.actualizarUI();
  },

  async sincronizarConBD() {
    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem('press_start_usuario_actual');
    if (!userId && !usuarioActual) return;

    try {
      const res = await fetch('/api/ranking.js');
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
    const keys = this.getStorageKeys();
    localStorage.setItem(keys.pts, this.puntosDisponibles.toString());
    localStorage.setItem(keys.inv, JSON.stringify(this.inventario));
    this.actualizarUI();
  },

  actualizarUI() {
    const spanMenu = document.getElementById("tienda-puntos-menu");
    if (spanMenu) spanMenu.innerText = this.puntosDisponibles;

    const spanShop = document.getElementById("shop-points-display");
    if (spanShop) spanShop.innerText = this.puntosDisponibles;

    // Actualizar contadores en la pantalla de la Tienda
    ['mitad', 'escudo', 'saltar', 'doble'].forEach(item => {
      const shopCant = document.getElementById(`shop-cant-${item}`) || document.getElementById(`owned-${item}`);
      if (shopCant) shopCant.innerText = this.inventario[item] || 0;

      // Actualizar contadores en el HUD de la partida durante la partida
      const hudCant = document.getElementById(`cant-${item}`);
      if (hudCant) hudCant.innerText = this.inventario[item] || 0;
    });
  },

  async comprarItem(itemKey) {
    const precio = this.PRECIOS[itemKey];
    if (!precio) return false;

    if (this.puntosDisponibles < precio) {
      if (typeof Sonidos !== 'undefined' && typeof Sonidos.playError === 'function') Sonidos.playError();
      alert("❌ ¡No tienes suficientes puntos!");
      return false;
    }

    const userId = localStorage.getItem('press_start_user_id');
    const usuarioActual = localStorage.getItem('press_start_usuario_actual');

    try {
      const res = await fetch('/api/tienda.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId ? parseInt(userId, 10) : null,
          nickname: usuarioActual,
          costo: precio
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.exito) {
          this.puntosDisponibles = data.puntosTotales !== undefined ? data.puntosTotales : (this.puntosDisponibles - precio);
        } else {
          this.puntosDisponibles -= precio;
        }
      } else {
        this.puntosDisponibles -= precio;
      }
    } catch (e) {
      console.warn("Falla de API tienda, procesando compra en modo local:", e);
      this.puntosDisponibles -= precio;
    }

    this.inventario[itemKey] = (this.inventario[itemKey] || 0) + 1;
    this.guardarDatos();

    if (typeof Sonidos !== 'undefined' && typeof Sonidos.playPowerUp === 'function') {
      Sonidos.playPowerUp();
    } else if (typeof Sonidos !== 'undefined' && typeof Sonidos.playCompra === 'function') {
      Sonidos.playCompra();
    }

    alert(`🎉 ¡Compraste 1 comodín! Te quedan ${this.puntosDisponibles} pts.`);
    return true;
  },

  usarItem(itemKey) {
    this.cargarDatos();
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