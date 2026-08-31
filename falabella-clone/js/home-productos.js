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

  // Estilos que se inyectan para las cards de producto
  const STYLES = `
  <style id="home-productos-styles">
    /* Sección propia de productos (reemplaza los esqueletos) */
    .hp-section {
      width: 100%;
      max-width: 1440px;
      margin: 24px auto;
      padding: 0 16px;
      box-sizing: border-box;
      font-family: Lato, Arial, sans-serif;
    }
    .hp-section h2 {
      font-size: 28px;
      font-weight: 700;
      color: #343E49;
      margin: 24px 8px 16px;
      letter-spacing: -0.3px;
    }
    .hp-section .hp-subtitle {
      font-size: 14px;
      color: #68717D;
      margin: -8px 8px 20px;
      font-weight: 400;
    }
    .hp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      padding: 8px;
    }
    .hp-card {
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow .2s ease, transform .15s ease;
      border: 1px solid #EEEEEE;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
    }
    .hp-card:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,.10);
      transform: translateY(-3px);
    }
    .hp-card-image {
      width: 100%;
      aspect-ratio: 1;
      background: #F7F7F7;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .hp-card-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform .25s ease;
    }
    .hp-card:hover .hp-card-image img {
      transform: scale(1.05);
    }
    .hp-card-body {
      padding: 12px 14px 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .hp-card-brand {
      font-size: 12px;
      font-weight: 700;
      color: #495867;
      text-transform: uppercase;
      letter-spacing: .4px;
      margin-bottom: 4px;
    }
    .hp-card-name {
      font-size: 14px;
      color: #343E49;
      line-height: 1.4;
      margin: 0 0 10px;
      font-weight: 400;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 39px;
    }
    .hp-card-price {
      font-size: 18px;
      font-weight: 700;
      color: #343E49;
      margin-top: auto;
    }
    .hp-card-old-price {
      font-size: 13px;
      color: #B0B6BD;
      text-decoration: line-through;
      font-weight: 400;
    }
    .hp-card-discount {
      position: absolute;
      top: 8px;
      left: 8px;
      background: #AAD500;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      z-index: 2;
    }
    /* Oculta los card-grid vacíos (esqueletos) hasta rellenarlos */
    .hp-section .hp-more {
      text-align: center;
      margin: 20px 0 8px;
    }
    .hp-section .hp-more a {
      display: inline-block;
      background: #fff;
      color: #343E49;
      border: 2px solid #343E49;
      padding: 10px 32px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all .2s ease;
    }
    .hp-section .hp-more a:hover {
      background: #343E49;
      color: #fff;
    }
  </style>
  `;

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

  // Insertar estilos en el head
  document.head.insertAdjacentHTML('beforeend', STYLES);

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
