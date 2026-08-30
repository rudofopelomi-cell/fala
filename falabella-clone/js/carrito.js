/* carrito.js - Modulo de carrito de compras persistente (localStorage).
 * Se expone como window.FalabellaCarrito para usarse desde tienda/carrito.
 */
(function () {
  var CLAVE = 'falabella_carrito';
  var items = [];

  function leerDelStorage() {
    try {
      items = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    } catch (e) { items = []; }
    return items;
  }
  function guardar() {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  }

  function buscar(id) { return items.find(function (i) { return String(i.id) === String(id); }); }

  function agregar(producto) {
    if (!producto || !producto.id) return;
    var existente = buscar(producto.id);
    if (existente) {
      existente.cantidad = (existente.cantidad || 1) + 1;
    } else {
      items.push({
        id: producto.id,
        nombre: producto.nombre || 'Producto',
        precio: producto.precio || '$0',
        imagen: producto.imagen || '/assets/productos/placeholder.svg',
        cantidad: producto.cantidad || 1,
      });
    }
    guardar();
    notificar();
    return true;
  }

  function quitar(id) {
    items = items.filter(function (i) { return String(i.id) !== String(id); });
    guardar();
    notificar();
  }

  function cambiarCantidad(id, delta) {
    var it = buscar(id);
    if (!it) return;
    it.cantidad = Math.max(1, (it.cantidad || 1) + delta);
    guardar();
    notificar();
  }

  function limpiar() { items = []; guardar(); notificar(); }

  function totalItems() {
    return items.reduce(function (acc, i) { return acc + (i.cantidad || 1); }, 0);
  }

  function subtotal() {
    return items.reduce(function (acc, i) {
      var num = parseInt(String(i.precio || '0').replace(/[^0-9]/g, ''), 10) || 0;
      return acc + num * (i.cantidad || 1);
    }, 0);
  }

  function formatear(n) { return '$' + n.toLocaleString('es-CO'); }

  function notificar() {
    var evento = new CustomEvent('carrito-actualizado', { detail: { items: items.slice() } });
    document.dispatchEvent(evento);
    actualizarBadge();
  }

  function actualizarBadge() {
    var badge = document.querySelector('.UserActions-module_has-count-desktop__RAhhE');
    if (badge) badge.textContent = totalItems();
  }

  window.FalabellaCarrito = {
    leerDelStorage: leerDelStorage,
    agregar: agregar,
    quitar: quitar,
    cambiarCantidad: cambiarCantidad,
    limpiar: limpiar,
    totalItems: totalItems,
    subtotal: subtotal,
    formatear: formatear,
    obtener: function () { return items.slice(); },
  };

  // Inicializar lectura
  leerDelStorage();
})();
