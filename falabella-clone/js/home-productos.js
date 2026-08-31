/* ============================================================
   FALABELLA CLONE - home-productos.js
   Rellena las secciones "esqueleto" (card-grids vacíos) con
   productos reales del catálogo local (productos_falabella.json)
   y añade secciones extra de productos en el index.
   ============================================================ */

(() => {
  'use strict';

  const JSON_URL = './productos_falabella.json';
  const SPA_BASE = '/falabella-co/product';

  // Cargar el CSS compartido de cards (css/productos.css) si no está ya cargado
  function cargarCSS(url) {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href && l.href.includes('productos.css'))) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    document.head.appendChild(l);
  }

  // Formatear precio COP
  function fmtCOP(n) {
    if (n === null || n === undefined) return '';
    return '$' + Number(n).toLocaleString('es-CO');
  }

  // Extraer marca del nombre (primera palabra en mayúscula)
  function getBrand(nombre) {
    const m = (nombre || '').match(/^([A-ZÀ-ÿ][A-ZÀ-ÿ0-9&\s]{0,20})(?=\s|$)/i);
    return m ? m[1].trim() : '';
  }

  // Slug del nombre para URL
  function slugify(s) {
    return s.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 60);
  }

  // Construir una card de producto
  function buildCard(p) {
    const url = p.url || `${SPA_BASE}/${slugify(p.nombre)}/${p.id}`;
    const brand = getBrand(p.nombre);
    const descuento = p.precioAntes && p.precioAntes > p.precio
      ? Math.round((1 - p.precio / p.precioAntes) * 100)
      : 0;

    return `
    <a class="hp-card" href="${url}" title="${(p.nombre || '').replace(/"/g, '&quot;')}">
      <div class="hp-card-image">
        ${descuento > 0 ? `<span class="hp-card-discount">-${descuento}%</span>` : ''}
        <img src="${p.imagen}" alt="${(p.nombre || '').replace(/"/g, '&quot;')}" loading="lazy"
             onerror="this.parentElement.style.display='none'">
      </div>
      <div class="hp-card-body">
        <div class="hp-card-brand">${brand}</div>
        <div class="hp-card-name">${p.nombre}</div>
        ${p.precioAntes ? `<div class="hp-card-old-price">${fmtCOP(p.precioAntes)}</div>` : ''}
        <div class="hp-card-price">${fmtCOP(p.precio)}</div>
      </div>
    </a>`;
  }

  // Insertar estilos en el head (CSS compartido externo)
  cargarCSS('/css/productos.css');

  // Cargar productos y rellenar
  function cargar() {
    fetch(JSON_URL)
      .then(r => r.json())
      .then(data => {
        const productos = data.productos || [];
        if (!productos.length) return;

        // ============ 1. RELLENAR CARD-GRIDS VACÍOS (esqueletos) ============
        // Buscar los card-grid que tienen las imágenes "lazy-load" no activadas
        // (img sin src válido = esqueleto) y reemplazar su contenido con productos.
        const cardGrids = document.querySelectorAll('[data-testid="card-grid"]');
        let idx = 0;

        cardGrids.forEach((grid, gi) => {
          // Detectar si las imágenes del grid no cargan (esqueleto)
          const imgs = grid.querySelectorAll('img');
          const sinSrc = [...imgs].filter(i => !i.src || !i.src.startsWith('http'));
          const esEsqueleto = sinSrc.length === imgs.length && imgs.length > 0;

          if (esEsqueleto && idx < 2) {
            // Rellenar con 4 productos del catálogo (Celulares + Computadores)
            const cats = idx === 0 ? ['Celulares', 'Computadores'] : ['Televisores', 'Relojes'];
            const seleccionados = productos.filter(p => cats.includes(p.categoria)).slice(0, 4);

            // Construir el nuevo contenido: sección con título
            const titulo = idx === 0 ? 'Lo más nuevo en Tecnología' : 'Ofertas de la Semana';
            const subtitulo = idx === 0 ? 'Celulares y computadores de las mejores marcas' : 'Televisores y relojes con descuentos';

            const html = `
              <div class="hp-section">
                <h2>${titulo}</h2>
                <div class="hp-subtitle">${subtitulo}</div>
                <div class="hp-grid">
                  ${seleccionados.map(buildCard).join('')}
                </div>
              </div>
            `;

            // Reemplazar el grid entero
            const parent = grid.closest('[data-entryid]') || grid.parentElement;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            parent.replaceWith(wrapper);
            idx++;
          }
        });

        // ============ 2. AGREGAR MÁS SECCIONES DE PRODUCTOS ============
        // Insertar secciones de catálogo entre las secciones existentes
        const catSecciones = [
          { titulo: 'Celulares y Smartphones', cat: 'Celulares', count: 8 },
          { titulo: 'Zapatos y Calzado', cat: 'Zapatos', count: 8 },
          { titulo: 'Relojes', cat: 'Relojes', count: 6 },
          { titulo: 'Perfumes y Fragancias', cat: 'Perfumes', count: 6 }
        ];

        // Insertar cada sección después del grid anterior (o antes del footer)
        const footer = document.querySelector('.Footer-module_footer-bottom__tP8X-, footer, [class*="Footer-module"]');
        const seoBlocks = document.querySelectorAll('[data-testid="SEOText-TestId"]');

        // Encontrar un anchor: el último card-grid o el último content block antes del footer
        let anchor = footer;
        if (seoBlocks.length) {
          anchor = seoBlocks[seoBlocks.length - 1].parentElement;
        }

        catSecciones.forEach((sec, i) => {
          const prods = productos.filter(p => p.categoria === sec.cat).slice(0, sec.count);
          if (!prods.length) return;

          // Insertar la nueva sección
          const wrapper = document.createElement('div');
          wrapper.innerHTML = `
            <div class="hp-section">
              <h2>${sec.titulo}</h2>
              <div class="hp-subtitle">Nuestra selección para ti</div>
              <div class="hp-grid">
                ${prods.map(buildCard).join('')}
              </div>
            </div>
          `;

          if (footer && (seoBlocks.length === 0 || i < 2)) {
            // Insertar antes del footer (o antes de los bloques SEO)
            if (footer && i < 2) {
              footer.parentElement.insertBefore(wrapper.firstElementChild, footer);
            } else {
              // Después del último grid
              const lastGrid = document.querySelectorAll('[data-testid="card-grid"]');
              if (lastGrid.length) {
                const last = lastGrid[lastGrid.length - 1];
                last.parentElement.insertBefore(wrapper.firstElementChild, last.nextSibling);
              }
            }
          } else if (anchor && seoBlocks.length > 0) {
            // Insertar las últimas secciones antes de los bloques SEO
            anchor.parentElement.insertBefore(wrapper.firstElementChild, anchor);
          }
        });

        // Añadir botón de ver más al final de todas las secciones
        const lastHp = document.querySelector('.hp-section:last-of-type');
        if (lastHp) {
          const moreBtn = document.createElement('div');
          moreBtn.className = 'hp-more';
          moreBtn.innerHTML = `<a href="/falabella-co/category/todos">Ver todos los productos</a>`;
          lastHp.appendChild(moreBtn);
        }
      })
      .catch(err => console.warn('[home-productos] Error cargando productos:', err));
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargar);
  } else {
    // Pequeño retraso para que React monte y los esqueletos aparezcan
    setTimeout(cargar, 300);
  }
})();
