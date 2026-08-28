const fs = require('fs');
const path = 'D:/Desarrollos/falabella/home.html';
const h = fs.readFileSync(path, 'utf8');

function show(label, start, len) {
  console.log('=== ' + label + ' ===');
  console.log(h.substring(start, start + len));
  console.log('');
}

// 1. El boton Banca en linea renderizado
const b = h.indexOf('MiddleNav_buttonPrimary__09N_a');
console.log('BOTON Banca en linea @', b);
show('BOTON contexto', b - 400, 900);

// 2. El div drawer
const d = h.indexOf('<div id="drawer">');
console.log('DRAWER @', d);
show('DRAWER', d, 300);

// 3. Buscar estilos / clases que abren-cierran el drawer (overlay / container)
const overlay = h.indexOf('Drawer_overlay__yhC34');
// Recoger contexto amplio para ver TODAS las clases del drawer y sus variantes
const di = h.indexOf('id="drawer"');
show('DRAWER completo (con clases)', di, 1500);
