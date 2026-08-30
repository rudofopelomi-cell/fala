/* carrito-page.js - Render del carrito (lista, cantidades, resumen) */
(function () {
  function escapar(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    var cont = document.getElementById('carrito-contenido');
    if (!cont) return;
    var items = window.FalabellaCarrito.obtener();
    var carrito = window.FalabellaCarrito;

    if (!items.length) {
      cont.innerHTML = '<div class="carrito-vacio">' +
        '<h2 style="font-size:22px;margin-bottom:10px;">Tu carrito está vacío</h2>' +
        '<p>Explora la tienda y agrega productos.</p>' +
        '<a href="tienda.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#AAD500;color:#fff;border-radius:6px;font-weight:700;text-decoration:none;">Ir a la tienda</a>' +
        '</div>';
      // actualizar badge
      carrito.notificar && carrito.notificar();
      return;
    }

    var filas = items.map(function (it) {
      var subtotal = (parseInt(String(it.precio || '0').replace(/[^0-9]/g, ''), 10) || 0) * (it.cantidad || 1);
      return '<div class="item-carrito" data-id="' + escapar(it.id) + '">' +
        '<img src="' + escapar(it.imagen) + '" alt="' + escapar(it.nombre) + '" onerror="this.onerror=null;this.src=\'/assets/productos/placeholder.svg\'">' +
        '<div class="detalle">' +
        '<div class="nombre">' + escapar(it.nombre) + '</div>' +
        '<div class="precio-u">' + escapar(it.precio) + ' c/u</div>' +
        '<div class="cantidad">' +
        '<button data-cant="-1" aria-label="Quitar">−</button>' +
        '<span class="num">' + (it.cantidad || 1) + '</span>' +
        '<button data-cant="1" aria-label="Agregar">+</button>' +
        '</div>' +
        '<button class="eliminar" data-eliminar>Eliminar</button>' +
        '</div>' +
        '<div class="subtotal">' + carrito.formatear(subtotal) + '</div>' +
        '</div>';
    }).join('');

    var subtotalTotal = carrito.subtotal();
    var envio = items.length ? 0 : 0;
    var total = subtotalTotal + envio;

    cont.innerHTML = '<div class="carrito-contenido">' +
      '<div class="carrito-items">' + filas +
      '<div style="text-align:right;margin-top:14px;"><button id="vaciar-carrito" class="btn-secundario" style="padding:8px 16px;border:1px solid #d3d3d3;border-radius:6px;background:#fff;cursor:pointer;color:#EB0045;font-size:13px;">Vaciar carrito</button></div>' +
      '</div>' +
      '<div class="resumen">' +
      '<h3>Resumen</h3>' +
      '<div class="fila"><span>Subtotal (' + carrito.totalItems() + ' productos)</span><span>' + carrito.formatear(subtotalTotal) + '</span></div>' +
      '<div class="fila"><span>Envío</span><span>Gratis</span></div>' +
      '<div class="fila total"><span>Total</span><span>' + carrito.formatear(total) + '</span></div>' +
      '<button id="btn-pagar" class="btn-pagar">Ir a pagar</button>' +
      '<a href="tienda.html" style="display:block;text-align:center;font-size:13px;color:#7EA300;margin-top:12px;text-decoration:none;font-weight:600;">← Seguir comprando</a>' +
      '</div></div>';

    // eventos
    cont.querySelectorAll('[data-cant]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.item-carrito').getAttribute('data-id');
        var delta = parseInt(btn.getAttribute('data-cant'), 10);
        carrito.cambiarCantidad(id, delta);
        render();
      });
    });
    cont.querySelectorAll('[data-eliminar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.item-carrito').getAttribute('data-id');
        carrito.quitar(id);
        render();
      });
    });
    var vaciar = document.getElementById('vaciar-carrito');
    if (vaciar) vaciar.addEventListener('click', function () { carrito.limpiar(); render(); });
    var pagar = document.getElementById('btn-pagar');
    if (pagar) pagar.addEventListener('click', function () { location.href = 'checkout.html'; });
  }

  function init() {
    render();
    document.addEventListener('header-cargado', function () {
      if (window.FalabellaCarrito) window.FalabellaCarrito.notificar();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
