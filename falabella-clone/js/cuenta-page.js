/* cuenta-page.js - Render de login/registro/perfil/pedidos en cuenta.html */
(function () {
  var VISTA = 'login'; // login | registro | perfil

  function escapar(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dibujarLogin() {
    var root = document.getElementById('cuenta-root');
    root.innerHTML = '<div class="cuenta-cols">' +
      '<div class="caja-auth" id="caja-login">' +
      '<h2>Inicia sesión</h2><p class="sub">Accede a tu cuenta Falabella.</p>' +
      '<div class="grupo"><label>Correo electrónico</label><input type="email" id="log-email" placeholder="tucorreo@ejemplo.com"></div>' +
      '<div class="grupo"><label>Contraseña</label><input type="password" id="log-pass" placeholder="Tu contraseña"></div>' +
      '<div class="mensaje-error" id="log-msg"></div>' +
      '<button class="btn-primario" id="btn-login">Ingresar</button>' +
      '<div class="cambiar-vista">¿No tienes cuenta? <a id="link-registro">Regístrate gratis</a></div>' +
      '</div></div>';

    document.getElementById('btn-login').addEventListener('click', function () {
      var email = document.getElementById('log-email').value.trim();
      var pass = document.getElementById('log-pass').value;
      var msg = document.getElementById('log-msg');
      if (!email || !pass) { msg.textContent = 'Completa correo y contraseña.'; return; }
      var r = window.FalabellaCuenta.login(email, pass);
      if (r.ok) { dibujarPerfil(); }
      else { msg.textContent = r.error; }
    });
    document.getElementById('link-registro').addEventListener('click', function () { dibujarRegistro(); });
  }

  function dibujarRegistro() {
    var root = document.getElementById('cuenta-root');
    root.innerHTML = '<div class="cuenta-cols">' +
      '<div class="caja-auth" id="caja-reg">' +
      '<h2>Crea tu cuenta</h2><p class="sub">Es gratis y rápido.</p>' +
      '<div class="grupo"><label>Nombre completo</label><input type="text" id="reg-nombre" placeholder="Nombre y apellido"></div>' +
      '<div class="grupo"><label>Correo electrónico</label><input type="email" id="reg-email" placeholder="tucorreo@ejemplo.com"></div>' +
      '<div class="grupo"><label>Contraseña</label><input type="password" id="reg-pass" placeholder="Mínimo 6 caracteres"></div>' +
      '<div class="grupo"><label>Confirmar contraseña</label><input type="password" id="reg-pass2" placeholder="Repite la contraseña"></div>' +
      '<div class="mensaje-error" id="reg-msg"></div>' +
      '<button class="btn-primario" id="btn-reg">Registrarme</button>' +
      '<div class="cambiar-vista">¿Ya tienes cuenta? <a id="link-login">Inicia sesión</a></div>' +
      '</div></div>';

    document.getElementById('btn-reg').addEventListener('click', function () {
      var nombre = document.getElementById('reg-nombre').value.trim();
      var email = document.getElementById('reg-email').value.trim();
      var pass = document.getElementById('reg-pass').value;
      var pass2 = document.getElementById('reg-pass2').value;
      var msg = document.getElementById('reg-msg');
      if (!nombre || !email || !pass) { msg.textContent = 'Completa todos los campos.'; return; }
      if (pass.length < 6) { msg.textContent = 'La contraseña debe tener mínimo 6 caracteres.'; return; }
      if (pass !== pass2) { msg.textContent = 'Las contraseñas no coinciden.'; return; }
      var r = window.FalabellaCuenta.registrar(nombre, email, pass);
      if (r.ok) { dibujarPerfil(); }
      else { msg.textContent = r.error; }
    });
    document.getElementById('link-login').addEventListener('click', function () { dibujarLogin(); });
  }

  function dibujarPerfil() {
    var root = document.getElementById('cuenta-root');
    var user = window.FalabellaCuenta.sesion();
    if (!user) { dibujarLogin(); return; }

    // pedidos
    var pedidos = [];
    try { pedidos = JSON.parse(localStorage.getItem('falabella_pedidos') || '[]'); } catch (e) {}
    var pedidosHtml = pedidos.length
      ? '<div class="pedidos"><h3>Mis pedidos</h3>' + pedidos.map(function (p) {
          return '<div class="pedido"><div class="cab"><span><b>Pedido #' + p.id + '</b></span><span class="estado">' + escapar(p.estado) + '</span></div>' +
            '<div>' + escapar(p.items.length) + ' producto(s) · ' + escapar(p.fecha) + '</div>' +
            '<div>Método: ' + escapar(p.detalleMetodo || p.metodo) + '</div>' +
            '<div style="margin-top:4px;"><b>' + window.FalabellaCarrito.formatear(p.total) + '</b></div></div>';
        }).join('') + '</div>'
      : '';

    root.innerHTML = '<div class="perfil">' +
      '<h2>Hola, ' + escapar(user.nombre) + ' 👋</h2>' +
      '<div class="dato"><b>Nombre</b><span>' + escapar(user.nombre) + '</span></div>' +
      '<div class="dato"><b>Correo</b><span>' + escapar(user.email) + '</span></div>' +
      '<button class="btn-secundario" id="btn-logout">Cerrar sesión</button>' +
      '</div>' + pedidosHtml;

    document.getElementById('btn-logout').addEventListener('click', function () {
      window.FalabellaCuenta.cerrarSesion();
      dibujarLogin();
    });
  }

  function init() {
    var user = window.FalabellaCuenta.sesion();
    if (user) dibujarPerfil();
    else dibujarLogin();
    document.addEventListener('header-cargado', function () {
      if (window.FalabellaCarrito) window.FalabellaCarrito.notificar();
      window.FalabellaCuenta.actualizarHeader();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
