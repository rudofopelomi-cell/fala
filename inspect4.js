const fs = require('fs');
const h = fs.readFileSync('D:/Desarrollos/falabella/home.html', 'utf8');

console.log('=== CONTEXTO 1er </body> ===');
console.log(h.substring(1205400, 1212000));
