const fs = require('fs');
const h = fs.readFileSync('D:/Desarrollos/falabella/home.html', 'utf8');

// 1. Simular la busqueda del boton (misma logica del script)
const btnIdx = h.indexOf('MiddleNav_buttonPrimary__09N_a MiddleNav_buttonBase__Y9uFD">Banca en l');
console.log('Boton Banca en linea en HTML @', btnIdx);
if (btnIdx > 0) {
  console.log('Snippet:', h.substring(btnIdx, btnIdx + 80));
}

// 2. Verificar que existe el cierre </script></body></html> correcto al final
console.log('\n=== Final del archivo (estructura) ===');
console.log(h.substring(h.length - 30));

// 3. Verificar el template/extension no se rompio
const templ = h.indexOf('</template></tldx-lmi-shadow-root>');
console.log('\nTemplate extension intacto:', templ > 0);

// 4. Contar balance de </body> (debe haber 2: uno del template, uno real)
let c = 0, m;
const re = /<\/body>/g;
while ((m = re.exec(h))) c++;
console.log('Total </body>:', c);

// 5. Verificar que solo hay UN script manolo
const marker = "Manolo: Modal 'Ingresa a tu cuenta'";
let cm = 0;
const re2 = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
while ((m = re2.exec(h))) cm++;
console.log('Scripts Manolo (marcador):', cm);
