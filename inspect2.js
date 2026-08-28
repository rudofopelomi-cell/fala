const fs = require('fs');
const h = fs.readFileSync('D:/Desarrollos/falabella/home.html', 'utf8');

// Extraer el bloque drawer completo
const start = h.indexOf('<div id="drawer">');
const end = h.indexOf('</div></div>', start); // hasta el cierre del drawer
// Mejor: buscar el cierre correcto - el drawer termina con </div> antes de <div id="modal-message">
const mm = h.indexOf('<div id="modal-message">', start);
console.log('=== BLOQUE DRAWER (entre <div id=drawer> y modal-message) ===');
console.log('len:', mm - start);
console.log(h.substring(start, start + 1200));
console.log('...');
console.log('=== FIN DEL BLOQUE ===');
console.log(h.substring(mm - 400, mm));
