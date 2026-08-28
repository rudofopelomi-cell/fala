const fs = require('fs');
const file = 'D:/Desarrollos/falabella/home.html';

let h = fs.readFileSync(file, 'utf8');

const SHOW_CLASS = 'Drawer_show__iSXeh';

const script = `
<!-- Manolo: Modal 'Ingresa a tu cuenta' - abrir al presionar 'Banca en linea' -->
<script>
(function () {
  function openLogin() {
    var overlay = document.querySelector('#drawer .Drawer_overlay__yhC34');
    var container = document.querySelector('#drawer .Drawer_container__7VFg4');
    if (overlay) overlay.classList.add('${SHOW_CLASS}');
    if (container) container.classList.add('${SHOW_CLASS}');
  }
  function closeLogin() {
    var overlay = document.querySelector('#drawer .Drawer_overlay__yhC34');
    var container = document.querySelector('#drawer .Drawer_container__7VFg4');
    if (overlay) overlay.classList.remove('${SHOW_CLASS}');
    if (container) container.classList.remove('${SHOW_CLASS}');
  }
  function bind() {
    // Boton 'Banca en linea' del header
    var buttons = document.querySelectorAll('header button');
    var loginBtn = null;
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.trim() === 'Banca en l\u00ednea' || buttons[i].textContent.trim() === 'Banca en linea') {
        loginBtn = buttons[i];
        break;
      }
    }
    if (loginBtn) {
      loginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openLogin();
      });
    }
    // Boton cerrar (X)
    var closeBtn = document.querySelector('#drawer .Drawer_close-icon__GjY9I');
    if (closeBtn) closeBtn.addEventListener('click', closeLogin);
    // Clic en el fondo oscuro (overlay)
    var overlay = document.querySelector('#drawer .Drawer_overlay__yhC34');
    if (overlay) overlay.addEventListener('click', closeLogin);
    // Tecla ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLogin();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
</script>
`;

// 1. Quitar el script donde quedo mal (dentro del template de la extension)
const marker = "<!-- Manolo: Modal 'Ingresa a tu cuenta' - abrir al presionar 'Banca en linea' -->";
const scriptStart = h.indexOf(marker);
if (scriptStart !== -1) {
  const scriptEnd = h.indexOf('</script>', scriptStart) + '</script>'.length;
  // Remover desde el comentario hasta </script> inclusive
  h = h.slice(0, scriptStart) + h.slice(scriptEnd);
  console.log('Script viejo (mal ubicado) removido.');
}

// 2. Insertar justo antes del ULTIMO </body>
const lastBody = h.lastIndexOf('</body>');
if (lastBody === -1) {
  console.log('ERROR: no se encontro </body>');
  process.exit(1);
}

// Evitar duplicados
if (h.includes(marker)) {
  console.log('El script ya existe al final. No se modifica.');
} else {
  h = h.slice(0, lastBody) + script + '\n' + h.slice(lastBody);
  fs.writeFileSync(file, h, 'utf8');
  console.log('Listo. Se inserto el script justo antes del </body> final.');
}
