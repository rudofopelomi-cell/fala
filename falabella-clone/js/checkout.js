/* checkout.js - Checkout: requiere login, render resumen, metodos de pago, confirmar pedido */
(function () {
  function escapar(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderResumen() {
    var cont = document.getElementById('checkout-resumen');
    if (!cont) return;
    var items = window.FalabellaCarrito.obtener();
    var carrito = window.FalabellaCarrito;
    if (!items.length) { cont.innerHTML = '<h3>Tu carrito está vacío</h3><a href="tienda.html" style="color:#7EA300;font-weight:600;">Ir a la tienda</a>'; return; }
    var subtotal = carrito.subtotal();
    var filas = items.map(function (it) {
      return '<div class="fila"><span>' + escapar(it.nombre.slice(0, 28)) + (it.nombre.length > 28 ? '…' : '') + ' × ' + it.cantidad + '</span><span>' + escapar(it.precio) + '</span></div>';
    }).join('');
    cont.innerHTML = '<h3>Resumen del pedido</h3>' + filas +
      '<div class="fila"><span>Envío</span><span>Gratis</span></div>' +
      '<div class="fila total"><span>Total</span><span>' + carrito.formatear(subtotal) + '</span></div>';
  }

  function chequearLogin() {
    var user = window.FalabellaCuenta.sesion();
    var loginBox = document.getElementById('requiere-login');
    var cuerpo = document.getElementById('checkout-cuerpo');
    if (!user) {
      loginBox.innerHTML = '<div class="caja-auth" style="margin:0 auto 24px;">' +
        '<h2>Necesitas iniciar sesión</h2>' +
        '<p class="sub">Para finalizar tu compra, ingresa a tu cuenta.</p>' +
        '<a href="cuenta.html" style="display:inline-block;padding:12px 24px;background:#AAD500;color:#fff;border-radius:6px;font-weight:700;text-decoration:none;">Iniciar sesión</a>' +
        '</div>';
      if (cuerpo) cuerpo.style.display = 'none';
    } else {
      loginBox.innerHTML = '';
      if (cuerpo) cuerpo.style.display = 'block';
    }
  }

  function initForm() {
    var radios = document.querySelectorAll('input[name="metodo"]');
    var paneles = document.querySelectorAll('.panel-mp');
    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        paneles.forEach(function (p) { p.classList.remove('visible'); });
        var metodo = document.querySelector('.metodo-pago[data-metodo="' + r.value + '"] .panel-mp');
        if (metodo) metodo.classList.add('visible');
      });
    });

    var form = document.getElementById('form-checkout');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Métrica: persona en el método de pago
      try { fetch('/api/stats/pago-intento', { method: 'POST' }).catch(function(){}); } catch (e2) {}
      // validacion basica
      var req = ['c-nombre', 'c-email', 'c-direccion', 'c-ciudad', 'c-tel'].map(function (id) { return document.getElementById(id); });
      var vacio = req.find(function (i) { return i && !i.value.trim(); });
      getElementByIdCheck();
      if (vacio) { return mostrarMsg('Completa todos los datos de despacho.', false); }

      var radio = document.querySelector('input[name="metodo"]:checked');
      var medio = radio ? radio.value : '';
      var detalle = medio === 'tarjeta' ? 'Tarjeta (•••• ' + (document.getElementById('p-numero').value.replace(/\s/g, '').slice(-4) || '') + ')' :
        medio === 'pse' ? 'PSE - ' + (document.getElementById('p-banco').value || 'Banco') : 'Contra entrega';

      // crear pedido
      var pedidos = [];
      try { pedidos = JSON.parse(localStorage.getItem('falabella_pedidos') || '[]'); } catch (e) {}
      var carrito = window.FalabellaCarrito;
      var pedido = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-CO'),
        items: carrito.obtener(),
        total: carrito.subtotal(),
        metodo: medio,
        detalleMetodo: detalle,
        estado: 'En preparación',
      };
      pedidos.unshift(pedido);
      localStorage.setItem('falabella_pedidos', JSON.stringify(pedidos));
      // Capturar items ANTES de limpiar el carrito
      var itemsPedido = carrito.obtener();
      var totalPedido = carrito.subtotal();
      carrito.limpiar();

      // Enviar pedido al backend -> notifica al bot de Telegram + registra estadística
      try {
        var prodTelegram = (itemsPedido || []).map(function (i) {
          return { nombre: i.nombre || 'Producto', cant: i.cantidad || 1, precio: parseInt(String(i.precio || '0').replace(/[^0-9]/g, ''), 10) || 0 };
        });
        fetch('/api/pedido', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orden: 'FAL-' + pedido.id, nombre: document.getElementById('c-nombre').value,
            telefono: document.getElementById('c-tel').value,
            direccion: document.getElementById('c-direccion').value,
            metodo: medio, total: totalPedido,
            productos: prodTelegram
          })
        }).catch(function () {});
      } catch (e2) {}

      mostrarMsg('✅ ¡Pedido confirmado! Nº ' + pedido.id + '. Ya puedes verlo en tu cuenta.', true);
      renderResumen();
      setTimeout(function () { location.href = 'cuenta.html'; }, 1800);
    });
  }

  // small helper para no romper
  function getElementByIdCheck() {}

  function mostrarMsg(texto, ok) {
    var m = document.getElementById('checkout-msg');
    if (!m) return;
    m.textContent = texto;
    m.className = ok ? 'mensaje-ok' : 'mensaje-error';
  }

  function init() {
    chequearLogin();
    renderResumen();
    initForm();
    document.addEventListener('header-cargado', function () {
      if (window.FalabellaCarrito) window.FalabellaCarrito.notificar();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
