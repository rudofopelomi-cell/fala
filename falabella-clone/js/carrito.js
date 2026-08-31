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
    // Mostrar toast de confirmación de producto agregado (más visible)
    try { mostrarToastAgregado(producto); } catch (e) {}
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
    mostrarToast: mostrarToastAgregado,
  };

  /* ---------- Toast de producto agregado (más visible, con botón) ---------- */
  function getToast() {
    var el = document.getElementById('fb-toast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'fb-toast';
    document.body.appendChild(el);
    return el;
  }
  function mostrarToastAgregado(producto) {
    var el = getToast();
    var nombre = (producto && producto.nombre) ? producto.nombre : 'Producto agregado';
    el.innerHTML = '<span class="fb-toast-ico">✅</span><span class="fb-toast-txt">' + escaparHtml(nombre) + '</span>' +
      '<button class="fb-toast-accion" onclick="window.FalabellaCarrito.verCarrito()">🛒 Ver carrito</button>';
    el.classList.add('fb-ok');
    el.classList.add('fb-show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('fb-show'); }, 3200);
  }
  function escaparHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.FalabellaCarrito.verCarrito = function () { location.href = 'carrito.html'; };

  /* ---------- FAB flotante de carrito (acceso a pagar) ---------- */
  function crearFAB() {
    if (document.getElementById('fb-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'fb-fab';
    fab.type = 'button';
    fab.title = 'Ver carrito y pagar';
    fab.innerHTML = '<span class="fb-fab-ico">🛒</span><span class="fb-fab-n" id="fb-fab-n">0</span><span class="fb-fab-total" id="fb-fab-total"></span>';
    fab.addEventListener('click', function () { window.FalabellaCarrito.verCarrito(); });
    document.body.appendChild(fab);
  }
  function actualizarFAB() {
    crearFAB();
    var fab = document.getElementById('fb-fab');
    if (!fab) return;
    var n = totalItems();
    fab.style.display = n > 0 ? 'flex' : 'none';
    var nn = document.getElementById('fb-fab-n'); if (nn) nn.textContent = n;
    var tt = document.getElementById('fb-fab-total'); if (tt) tt.textContent = subtotal() > 0 ? formatear(subtotal()) : '';
  }
  // Actualizar FAB en cada cambio
  var _origNotificar = notificar;
  notificar = function () {
    _origNotificar.call(null);
    try { actualizarFAB(); } catch (e) {}
  };
  // Crear FAB al cargar
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', actualizarFAB);
  else actualizarFAB();

  // Inicializar lectura
  leerDelStorage();
  actualizarFAB();
})();
