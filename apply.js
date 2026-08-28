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

// Insertar antes de </body>
if (h.includes(script)) {
  console.log('El script ya existe. No se modifica.');
} else {
  h = h.replace('</body>', script + '\n</body>');
  fs.writeFileSync(file, h, 'utf8');
  console.log('Listo. Se inserto el script que abre la modal al presionar "Banca en linea".');
}
