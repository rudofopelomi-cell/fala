const fs = require('fs');
const file = 'D:/Desarrollos/falabella/home.html';
const h = fs.readFileSync(file, 'utf8');

// Ver el final del archivo para insertar el script antes de </body>
console.log('largo total:', h.length);
console.log('=== ULTIMOS 800 caracteres ===');
console.log(h.substring(h.length - 800));
