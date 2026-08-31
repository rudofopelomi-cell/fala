<?php
/**
 * Router para php -S que hace funcionar el clon de Falabella (SPA + tienda local).
 *
 * Resuelve:
 *  1. MIME .js.descarga -> javascript (para que React/Next hidrate el index.html real).
 *  2. Sufre / -> index.html (la home real).
 *  3. Reescribe TODOS los links https://www.falabella.com.co/falabella-co/... a rutas
 *     LOCALES /falabella-co/... para que la web no vuelva a salir al sitio original.
 *  4. Inyecta el "shell" de la tienda local (catálogo + carrito + pagos) en memoria,
 *     sin tocar el index.html en disco.
 *  5. Sufre el JSON del catálogo como application/json.
 *  6. CSS inexistente -> 200 vacío.
 *
 * Uso: php -S 0.0.0.0:3000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 0) JSON del catalogo
if ($uri === '/productos_falabella.json' || $uri === '/falabella-co/productos_falabella.json') {
    $f = __DIR__ . '/productos_falabella.json';
    if (is_file($f)) {
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Length: ' . filesize($f));
        readfile($f);
        return true;
    }
}

// 1) MIME para chunks JS de Next
if (preg_match('/\.(?:js\.descarga|descarga|mjs|js)$/i', $uri)) {
    $archivo = __DIR__ . $uri;
    if (is_file($archivo)) {
        header('Content-Type: application/javascript');
        header('Content-Length: ' . filesize($archivo));
        readfile($archivo);
        return true;
    }
}

// 2) RUTAS SPA INTERNAS (tienda local): /falabella-co/* -> HTML ligero (carga instantánea,
//    sin los scripts bloqueantes de Cloudflare/tracking del index original).
if ($uri !== '/' && $uri !== '/index.html' && strpos($uri, '/falabella-co') === 0 && !preg_match('/\.(css|js|json|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i', $uri)) {
    $archivo = __DIR__ . '/spa-shell.html';
    if (is_file($archivo)) {
        $html = file_get_contents($archivo);
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Length: ' . strlen($html));
        echo $html;
        return true;
    }
}

// 3) HOME raiz -> index.html original (reescrito + shell inyectado)
if ($uri === '/' || $uri === '/index.html') {
    $archivo = __DIR__ . '/index.html';
    if (is_file($archivo)) {
        $html = file_get_contents($archivo);
        $html = construirSPA($html);
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Length: ' . strlen($html));
        echo $html;
        return true;
    }
}

// 4) CSS dinamico inexistente -> 200 vacio
if (preg_match('/\.css$/i', $uri) && !is_file(__DIR__ . $uri)) {
    header('Content-Type: text/css; charset=utf-8');
    header('Content-Length: 0');
    return true;
}

// 5) Resto -> servir tal cual
return false;

/**
 * Reescribe links de Falabella a rutas locales y agrega el shell de la tienda.
 */
function construirSPA($html) {
    // === REWRITE GLOBAL SEGURO ===
    // Reemplaza TODAS las ocurrencias del dominio del sitio (en href, src, action, y dentro
    // de los datos serializados de React/Next en <script>) por rutas locales.
    // https://www.falabella.com.co/falabella-co/X  ->  /falabella-co/X
    // Solo cambia el contenido del string URL, no la sintaxis JSON/JS, por lo que es seguro.
    $html = str_replace(
        'https://www.falabella.com.co/falabella-co',
        '/falabella-co',
        $html
    );
    // Formas sin www y http (variantes)
    $html = str_replace(
        'https://www.falabella.com.co/falabella-co/',
        '/falabella-co/',
        $html
    );
    $html = str_replace(
        'http://www.falabella.com.co/falabella-co',
        '/falabella-co',
        $html
    );
    $html = str_replace(
        'www.falabella.com.co/falabella-co',
        '/falabella-co',
        $html
    );

    // Limpieza de metadatos/comentarios de origen guardado
    $html = str_replace(
        '<!-- saved from url=(0041)https://www.falabella.com.co/falabella-co -->',
        '<!-- clon local Falabella -->',
        $html
    );
    $html = preg_replace(
        '#content="https?://www\.falabella\.com\.co/falabella-co([^"]*)"#',
        'content="/falabella-co$1"',
        $html
    );

    // d) Cargar el shell de la tienda justo antes de </body>
    $shell = @file_get_contents(__DIR__ . '/app-shell.html');
    if ($shell !== false) {
        $html = str_replace('</body>', $shell . "\n</body>", $html);
    }

    return $html;
}
