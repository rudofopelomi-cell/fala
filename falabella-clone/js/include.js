/* include.js - Inyecta el header y footer REALES de Falabella en las paginas
 * complementarias (tienda, carrito, checkout, cuenta) y redirige los enlaces
 * del header hacia las rutas locales. Mantiene la identidad visual del sitio.
 */
(function () {
  // Enlaces externos del header que apuntan al sitio real -> reescribir a locales
  var LINKS = {
    'testId-UserAction-basket': 'carrito.html',      // carrito
    'testId-userAction-orders': 'cuenta.html',       // Mi cuenta
    'testId-UserAction-userinfo': 'cuenta.html',     // cuenta (div, se enlaza via click)
    'testId-UserAction-wishlist': 'tienda.html',     // wishlist -> tienda
    'testId-logo-btn': 'index.html',                 // logo -> home (index real)
    'testId-store-links-0': 'index.html',            // tienda falabella -> home
    'testId-search-wrapper': 'tienda.html',          // buscador -> tienda
  };

  function arreglarEnlaces() {
    Object.keys(LINKS).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var target = LINKS[id];
      if (el.tagName === 'A') {
        el.setAttribute('href', target);
      } else if (el.hasAttribute('data-testid')) {
        // para divs/inputs: enlace via click
        if (id === 'testId-UserAction-userinfo' || id === 'testId-search-wrapper') {
          el.onclick = function (e) { e.preventDefault(); location.href = target; };
        }
      }
    });
  }

  function cargarPartial(url, contenedorId) {
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        document.getElementById(contenedorId).innerHTML = html;
        arreglarEnlaces();
        // disparar evento para que los modulos (cuenta/carrito) actualicen el header
        document.dispatchEvent(new CustomEvent('header-cargado'));
      })
      .catch(function (e) { console.error('No pudo cargar ' + url, e); });
  }

  window.cargarCabecera = function () { return cargarPartial('partials/header.html', 'cabecera'); };
  window.cargarPie = function () { return cargarPartial('partials/footer.html', 'pie'); };

  // Cargar ambos cuando el DOM este listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      Promise.all([window.cargarCabecera(), window.cargarPie()]);
    });
  } else {
    Promise.all([window.cargarCabecera(), window.cargarPie()]);
  }
})();
