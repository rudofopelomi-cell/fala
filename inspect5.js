const fs = require('fs');
const h = fs.readFileSync('D:/Desarrollos/falabella/home.html', 'utf8');

const marker = "<!-- Manolo: Modal 'Ingresa a tu cuenta'";
const pos = h.indexOf(marker);
console.log('Script @', pos);
console.log('Ultimo </body>', h.lastIndexOf('</body>'));
console.log('largo total', h.length);

console.log('=== ULTIMOS 1200 caracteres ===');
console.log(h.substring(h.length - 1200));
