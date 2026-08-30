<?php
/**
 * Router para php -S que hace funcionar el fala.html real (plantilla Next de Falabella).
 *
 * Resuelve 2 problemas:
 *  1. Los .js.descarga (scripts de Next) se sirven como text/plain -> el navegador
 *     NO los ejecuta y el diseño SSR queda "muerto/descuadrado". Aqui se sirven
 *     como application/javascript para que React hidrate la pagina real.
 *  2. URI base: sirve / como /fala.html (la home real) sin renombrar archivos.
 *
 * Uso: php -S 0.0.0.0:3000 router.php
 */

// 1) MIME para los archivos .descarga (chunks JS de Next) -> javascript
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('/\.(?:js\.descarga|descarga|mjs|js)$/i', $uri)) {
    $archivo = __DIR__ . $uri;
    if (is_file($archivo)) {
        header('Content-Type: application/javascript');
        header('Content-Length: ' . filesize($archivo));
        readfile($archivo);
        return true;
    }
}

// 2) La home real es index.html (el original intacto): sirvela en /
if ($uri === '/' || $uri === '/index.html') {
    $archivo = __DIR__ . '/index.html';
    if (is_file($archivo)) {
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Length: ' . filesize($archivo));
        readfile($archivo);
        return true;
    }
}

// 3) Resto de archivos -> servir tal cual (php -S construido por defecto)
return false;
