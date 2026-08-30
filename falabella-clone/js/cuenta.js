/* cuenta.js - Modulo de cuenta: registro, login, logout y perfil.
 * Usuarios en localStorage['falabella_usuarios'], sesion en localStorage['falabella_usuario'].
 * Actualiza el header real (label "Hola, [nombre]") en todas las paginas.
 */
(function () {
  var CLAVE_USUARIOS = 'falabella_usuarios';
  var CLAVE_SESION = 'falabella_usuario';

  function leerUsuarios() {
    try { return JSON.parse(localStorage.getItem(CLAVE_USUARIOS) || '[]'); }
    catch (e) { return []; }
  }
  function guardarUsuarios(users) { localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(users)); }

  function sesion() {
    try { return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); }
    catch (e) { return null; }
  }
  function guardarSesion(u) { localStorage.setItem(CLAVE_SESION, JSON.stringify(u)); }
  function cerrarSesion() { localStorage.removeItem(CLAVE_SESION); notificar(); }

  function registrar(nombre, email, password) {
    var users = leerUsuarios();
    if (users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
      return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
    }
    var nuevo = { id: Date.now(), nombre: nombre.trim(), email: email.trim(), password: password };
    users.push(nuevo);
    guardarUsuarios(users);
    guardarSesion({ id: nuevo.id, nombre: nuevo.nombre, email: nuevo.email });
    notificar();
    return { ok: true, usuario: nuevo };
  }

  function login(email, password) {
    var users = leerUsuarios();
    var u = users.find(function (x) {
      return x.email.toLowerCase() === email.toLowerCase() && x.password === password;
    });
    if (!u) return { ok: false, error: 'Credenciales incorrectas.' };
    guardarSesion({ id: u.id, nombre: u.nombre, email: u.email });
    notificar();
    return { ok: true, usuario: u };
  }

  function notificar() {
    document.dispatchEvent(new CustomEvent('cuenta-actualizada'));
    actualizarHeader();
  }

  // Actualizar el label del header real
  function actualizarHeader() {
    var label = document.querySelector('.UserInfo-module_my-account-label__UrVts');
    var saludo = document.querySelector('.UserInfo-module_display1__XXsVP');
    var user = sesion();
    if (label) {
      if (user) {
        label.textContent = user.nombre.split(' ')[0];
        label.style.fontWeight = '700';
        if (saludo) saludo.textContent = 'Hola,';
      } else {
        label.textContent = 'Inicia sesión';
        label.style.fontWeight = '';
        if (saludo) saludo.textContent = 'Hola,';
      }
    }
    // el propio header ya enlaza via include.js a cuenta.html
  }

  // Re-enganchar al cargar el header via partial
  document.addEventListener('header-cargado', actualizarHeader);

  window.FalabellaCuenta = {
    sesion: sesion,
    registrar: registrar,
    login: login,
    cerrarSesion: cerrarSesion,
    actualizarHeader: actualizarHeader,
  };

  // init en todas las paginas
  actualizarHeader();
})();
