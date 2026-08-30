/* tienda.js - Listar productos, filtrar por categoria, agregar al carrito */
(function () {
  var CATEGORIA_ACTIVA = 'todas';

  function formatearPrecio(valor) {
    // valor como "$1.999.900" o "1.999.900"
    if (!valor) return '';
    var t = String(valor).replace(/[^0-9]/g, '');
    if (!t) return '';
    var num = parseInt(t, 10);
    return '$' + num.toLocaleString('es-CO');
  }

  function escapar(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function cargarProductos() {
    return fetch('products.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { return data.productos || []; });
  }

  function dibujarFiltros(productos) {
    var cont = document.getElementById('filtros');
    if (!cont) return;
    var cats = ['todas'].concat(Array.from(new Set(productos.map(function (p) { return p.categoria; }))).sort());
    cont.innerHTML = cats.map(function (c) {
      var nombre = c === 'todas' ? 'Todas' : c;
      var cls = (CATEGORIA_ACTIVA === c) ? 'chip activo' : 'chip';
      if (c === 'todas') cls += ' todos';
      return '<button class="' + cls + '" data-cat="' + escapar(c) + '">' + escapar(nombre) + '</button>';
    }).join('');
    cont.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CATEGORIA_ACTIVA = btn.getAttribute('data-cat');
        cont.querySelectorAll('.chip').forEach(function (b) {
          b.className = (b.getAttribute('data-cat') === 'todas') ? 'chip todos' : 'chip';
        });
        if (CATEGORIA_ACTIVA === 'todas') btn.className = 'chip todos activo';
        else btn.className = 'chip activo';
        dibujarProductos(productos);
      });
    });
  }

  function dibujarProductos(productos) {
    var grid = document.getElementById('grid-productos');
    var contador = document.getElementById('contador-resultados');
    if (!grid) return;
    var filtrados = CATEGORIA_ACTIVA === 'todas'
      ? productos
      : productos.filter(function (p) { return p.categoria === CATEGORIA_ACTIVA; });

    if (contador) contador.textContent = filtrados.length + ' producto' + (filtrados.length !== 1 ? 's' : '') + ' (' + CATEGORIA_ACTIVA + ')';

    if (!filtrados.length) {
      grid.innerHTML = '<p style="color:#6b6b6b;grid-column:1/-1;text-align:center;padding:40px 0;">No hay productos en esta categoría.</p>';
      return;
    }

    grid.innerHTML = filtrados.map(function (p) {
      var precioTarjeta = p.precioTarjeta ? '<div class="precio-tarjeta">' + escapar(p.precioTarjeta) + ' <span style="font-size:11px;">(Tarjeta CMR)</span></div>' : '';
      var original = p.precioOriginal ? '<span class="precio-original">' + escapar(p.precioOriginal) + '</span>' : '';
      var desc = p.descuento ? '<span class="descuento">-' + escapar(p.descuento) + '</span>' : '';
      return '<div class="card-producto" data-id="' + escapar(p.id) + '">' +
        '<div class="img-wrap"><img src="' + escapar(p.imagen) + '" alt="' + escapar(p.nombre) + '" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/productos/placeholder.svg\'"></div>' +
        '<div class="info">' +
        (p.marca ? '<div class="marca">' + escapar(p.marca) + '</div>' : '') +
        '<div class="nombre">' + escapar(p.nombre) + '</div>' +
        '<div><span class="precio">' + escapar(p.precio) + '</span>' + desc + '</div>' +
        original + precioTarjeta +
        '<button class="btn-agregar" data-agregar="' + escapar(p.id) + '">Agregar al carrito</button>' +
        '</div></div>';
    }).join('');

    grid.querySelectorAll('[data-agregar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-agregar');
        var prod = productos.find(function (p) { return String(p.id) === id; });
        if (prod) window.FalabellaCarrito.agregar(prod);
      });
    });
  }

  function actualizarBadge() {
    // actualizar el contador del header real (#testId-UserAction-basket + .has-count)
    var badge = document.querySelector('.UserActions-module_has-count-desktop__RAhhE');
    if (badge) {
      var total = window.FalabellaCarrito ? window.FalabellaCarrito.totalItems() : 0;
      badge.textContent = total;
    }
  }

  function init() {
    cargarProductos().then(function (productos) {
      dibujarFiltros(productos);
      dibujarProductos(productos);
    }).catch(function (e) { console.error('No pudo cargar productos.json', e); });
    // cuando el header cargue, actualizar badge
    document.addEventListener('header-cargado', actualizarBadge);
    // reaccionar a cambios del carrito (si se agrego desde otra pagina)
    window.addEventListener('storage', function () {
      var cart = window.FalabellaCarrito;
      if (cart) cart.leerDelStorage();
      actualizarBadge();
    });
    actualizarBadge();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
