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
    cont.className = 'hp-filtros';
    cont.innerHTML = cats.map(function (c) {
      var nombre = c === 'todas' ? 'Todas' : c;
      var cls = (CATEGORIA_ACTIVA === c) ? 'hp-chip activo' : 'hp-chip';
      return '<button class="' + cls + '" data-cat="' + escapar(c) + '">' + escapar(nombre) + '</button>';
    }).join('');
    cont.querySelectorAll('.hp-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        CATEGORIA_ACTIVA = btn.getAttribute('data-cat');
        cont.querySelectorAll('.hp-chip').forEach(function (b) {
          b.className = 'hp-chip' + (b.getAttribute('data-cat') === CATEGORIA_ACTIVA ? ' activo' : '');
        });
        dibujarProductos(productos);
      });
    });
  }

  function extraerMarca(nombre) {
    var m = String(nombre || '').match(/^([A-ZÀ-ÿ][A-ZÀ-ÿ0-9&\s]{0,20})(?=\s|$)/i);
    return m ? m[1].trim() : '';
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
      grid.innerHTML = '<div class="hp-vacio">No hay productos en esta categoría.</div>';
      return;
    }

    // Estética hp-card (misma que el index / SPA)
    grid.className = 'hp-grid';
    grid.innerHTML = filtrados.map(function (p) {
      var desc = p.descuento ? '<span class="hp-card-discount">-' + escapar(String(p.descuento).replace('%','')) + '%</span>' : '';
      var old = p.precioOriginal ? '<div class="hp-card-old-price">' + escapar(p.precioOriginal) + '</div>' : '';
      var link = p.link || '#';
      return '<div class="hp-card">' +
        '<a class="hp-card-link" href="' + escapar(link) + '" style="display:flex;flex-direction:column;flex:1;text-decoration:none;color:inherit;">' +
          '<div class="hp-card-image">' + desc +
            '<img src="' + escapar(p.imagen) + '" alt="' + escapar(p.nombre) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
          '</div>' +
          '<div class="hp-card-body">' +
            '<div class="hp-card-brand">' + escapar(p.marca || extraerMarca(p.nombre)) + '</div>' +
            '<div class="hp-card-name">' + escapar(p.nombre) + '</div>' +
            old +
            '<div class="hp-card-price">' + escapar(p.precio) + '</div>' +
          '</div>' +
        '</a>' +
        '<button class="hp-card-add" data-agregar="' + escapar(p.id) + '">Agregar al carrito</button>' +
      '</div>';
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
